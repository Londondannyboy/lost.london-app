import { neon } from '@neondatabase/serverless'

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY
const DATABASE_URL = process.env.DATABASE_URL

if (!VOYAGE_API_KEY) {
  console.error('VOYAGE_API_KEY is required')
  process.exit(1)
}

if (!DATABASE_URL) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const sql = neon(DATABASE_URL)

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
      // Split long paragraphs by sentences
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

// Get embeddings from Voyage AI
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

// Process in batches to avoid rate limits
async function processBatch<T>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<void>
) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    await processor(batch)
    console.log(`  Processed ${Math.min(i + batchSize, items.length)}/${items.length}`)
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 200))
  }
}

async function main() {
  console.log('Starting embedding population...\n')

  // Clear existing chunks
  console.log('Clearing existing knowledge_chunks...')
  await sql`DELETE FROM knowledge_chunks`

  // Fetch all articles
  console.log('\nFetching articles...')
  const articles = await sql`
    SELECT id, title, content, author, slug, categories, borough, historical_era
    FROM articles
    WHERE content IS NOT NULL AND LENGTH(content) > 100
  `
  console.log(`Found ${articles.length} articles`)

  // Fetch Thorney Island content
  console.log('\nFetching Thorney Island chunks...')
  const thorneyChunks = await sql`
    SELECT id, chunk_number, content
    FROM thorney_island_knowledge
    ORDER BY chunk_number
  `
  console.log(`Found ${thorneyChunks.length} Thorney Island chunks`)

  // Prepare all chunks for embedding
  interface ChunkData {
    source_type: string
    source_id: number
    title: string
    content: string
    chunk_index: number
    metadata: object
  }

  const allChunks: ChunkData[] = []

  // Process articles into chunks
  console.log('\nChunking articles...')
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

  // Process Thorney Island chunks (already chunked, but may need re-chunking)
  console.log('Chunking Thorney Island content...')
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

  console.log(`\nTotal chunks to embed: ${allChunks.length}`)

  // Generate embeddings and insert in batches
  console.log('\nGenerating embeddings and inserting...')

  await processBatch(allChunks, 10, async (batch) => {
    // Get embeddings for this batch
    const texts = batch.map(c => `${c.title}\n\n${c.content}`)
    const embeddings = await getEmbeddings(texts)

    // Insert each chunk with its embedding
    for (let i = 0; i < batch.length; i++) {
      const chunk = batch[i]
      const embedding = embeddings[i]

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
  })

  // Verify
  const count = await sql`SELECT COUNT(*) as count FROM knowledge_chunks`
  console.log(`\nDone! Inserted ${count[0].count} chunks with embeddings.`)

  // Show breakdown
  const breakdown = await sql`
    SELECT source_type, COUNT(*) as count
    FROM knowledge_chunks
    GROUP BY source_type
  `
  console.log('\nBreakdown:')
  for (const row of breakdown) {
    console.log(`  ${row.source_type}: ${row.count} chunks`)
  }
}

main().catch(console.error)
