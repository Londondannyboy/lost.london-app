import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'vic-keegan-2024'

// Chunk text into ~800 token pieces (roughly 3200 chars)
function chunkText(text: string, maxChars: number = 3200): string[] {
  const chunks: string[] = []
  const paragraphs = text.split(/\n\n+/)
  let currentChunk = ''

  for (const para of paragraphs) {
    if (currentChunk.length + para.length > maxChars && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = ''
    }

    if (para.length > maxChars) {
      const sentences = para.split(/(?<=[.!?])\s+/)
      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxChars && currentChunk.length > 0) {
          chunks.push(currentChunk.trim())
          currentChunk = ''
        }
        currentChunk += (currentChunk ? ' ' : '') + sentence
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: texts,
      model: 'voyage-2',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Voyage API error: ${response.status} ${error}`)
  }

  const data = await response.json()
  return data.data.map((d: any) => d.embedding)
}

export async function POST(request: NextRequest) {
  try {
    // Simple auth check
    const { secret } = await request.json()
    if (secret !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!VOYAGE_API_KEY) {
      return NextResponse.json({ error: 'VOYAGE_API_KEY not configured' }, { status: 500 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Clear existing chunks
    await sql`DELETE FROM knowledge_chunks`

    // Fetch all articles
    const articles = await sql`
      SELECT id, title, content, author, slug, categories, borough, historical_era
      FROM articles
      WHERE content IS NOT NULL AND LENGTH(content) > 100
    `

    // Fetch Thorney Island content
    const thorneyChunks = await sql`
      SELECT id, chunk_number, content
      FROM thorney_island_knowledge
      ORDER BY chunk_number
    `

    interface ChunkData {
      source_type: string
      source_id: number
      title: string
      content: string
      chunk_index: number
      metadata: object
    }

    const allChunks: ChunkData[] = []

    // Process articles
    for (const article of articles) {
      const textChunks = chunkText(article.content || '')
      for (let i = 0; i < textChunks.length; i++) {
        allChunks.push({
          source_type: 'article',
          source_id: article.id,
          title: article.title,
          content: textChunks[i],
          chunk_index: i,
          metadata: {
            author: article.author,
            slug: article.slug,
            categories: article.categories,
            borough: article.borough,
            era: article.historical_era,
            total_chunks: textChunks.length,
          },
        })
      }
    }

    // Process Thorney Island
    for (const chunk of thorneyChunks) {
      const textChunks = chunkText(chunk.content || '')
      for (let i = 0; i < textChunks.length; i++) {
        allChunks.push({
          source_type: 'thorney_island',
          source_id: chunk.id,
          title: `Thorney Island - Section ${chunk.chunk_number}`,
          content: textChunks[i],
          chunk_index: i,
          metadata: {
            author: 'Vic Keegan',
            original_chunk_number: chunk.chunk_number,
            total_chunks: textChunks.length,
          },
        })
      }
    }

    // Process in batches of 10
    let processed = 0
    for (let i = 0; i < allChunks.length; i += 10) {
      const batch = allChunks.slice(i, i + 10)
      const texts = batch.map(c => `${c.title}\n\n${c.content}`)
      const embeddings = await getEmbeddings(texts)

      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j]
        const embedding = embeddings[j]

        await sql`
          INSERT INTO knowledge_chunks
          (source_type, source_id, title, content, chunk_index, metadata, embedding)
          VALUES (
            ${chunk.source_type},
            ${chunk.source_id},
            ${chunk.title},
            ${chunk.content},
            ${chunk.chunk_index},
            ${JSON.stringify(chunk.metadata)},
            ${JSON.stringify(embedding)}::vector
          )
        `
      }
      processed += batch.length

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    // Get final count
    const count = await sql`SELECT COUNT(*) as count FROM knowledge_chunks`
    const breakdown = await sql`
      SELECT source_type, COUNT(*) as count
      FROM knowledge_chunks
      GROUP BY source_type
    `

    return NextResponse.json({
      success: true,
      message: 'Embeddings rebuilt successfully',
      total_chunks: count[0].count,
      breakdown: breakdown.reduce((acc: any, row: any) => {
        acc[row.source_type] = parseInt(row.count)
        return acc
      }, {}),
    })
  } catch (error) {
    console.error('Rebuild embeddings error:', error)
    return NextResponse.json(
      { error: 'Failed to rebuild embeddings', details: String(error) },
      { status: 500 }
    )
  }
}
