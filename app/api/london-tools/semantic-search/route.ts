import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY

// Get embedding for a query
async function getQueryEmbedding(text: string): Promise<number[]> {
  if (!VOYAGE_API_KEY) {
    throw new Error('VOYAGE_API_KEY not configured')
  }

  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: [text],
      model: 'voyage-2',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Voyage API error: ${response.status} ${error}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

interface SearchResult {
  id: number
  source_type: string
  source_id: number
  title: string
  content: string
  chunk_index: number
  metadata: Record<string, any>
  similarity: number
}

async function semanticSearch(query: string, limit: number = 10): Promise<SearchResult[]> {
  const sql = neon(process.env.DATABASE_URL!)

  // Get embedding for the query
  const queryEmbedding = await getQueryEmbedding(query)

  // Search using cosine similarity
  const results = await sql`
    SELECT
      id,
      source_type,
      source_id,
      title,
      content,
      chunk_index,
      metadata,
      1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
    FROM knowledge_chunks
    ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
    LIMIT ${limit}
  `

  return results.map((r: any) => ({
    id: r.id,
    source_type: r.source_type,
    source_id: r.source_id,
    title: r.title,
    content: r.content,
    chunk_index: r.chunk_index,
    metadata: r.metadata,
    similarity: parseFloat(r.similarity),
  }))
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || searchParams.get('query')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required', results: [] },
        { status: 400 }
      )
    }

    const results = await semanticSearch(query, limit)

    return NextResponse.json({
      success: true,
      query,
      count: results.length,
      sources: {
        articles: results.filter(r => r.source_type === 'article').length,
        thorney_island: results.filter(r => r.source_type === 'thorney_island').length,
      },
      results: results.map(r => ({
        id: r.id,
        source_type: r.source_type,
        source_id: r.source_id,
        title: r.title,
        content: r.content.substring(0, 1500),
        excerpt: r.content.substring(0, 400) + (r.content.length > 400 ? '...' : ''),
        chunk_index: r.chunk_index,
        metadata: r.metadata,
        similarity: Math.round(r.similarity * 100) / 100,
        // For backwards compatibility with VoiceWidget
        author: r.metadata?.author || 'Vic Keegan',
        slug: r.metadata?.slug,
        categories: r.metadata?.categories,
        url: r.metadata?.slug ? `/article/${r.metadata.slug}` : undefined,
      })),
    })
  } catch (error) {
    console.error('Semantic search error:', error)
    return NextResponse.json(
      { error: 'Search failed', results: [] },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 10 } = await request.json()

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required', results: [] },
        { status: 400 }
      )
    }

    const results = await semanticSearch(query, limit)

    return NextResponse.json({
      success: true,
      query,
      count: results.length,
      sources: {
        articles: results.filter(r => r.source_type === 'article').length,
        thorney_island: results.filter(r => r.source_type === 'thorney_island').length,
      },
      results: results.map(r => ({
        id: r.id,
        source_type: r.source_type,
        source_id: r.source_id,
        title: r.title,
        content: r.content.substring(0, 1500),
        excerpt: r.content.substring(0, 400) + (r.content.length > 400 ? '...' : ''),
        chunk_index: r.chunk_index,
        metadata: r.metadata,
        similarity: Math.round(r.similarity * 100) / 100,
        // For backwards compatibility with VoiceWidget
        author: r.metadata?.author || 'Vic Keegan',
        slug: r.metadata?.slug,
        categories: r.metadata?.categories,
        url: r.metadata?.slug ? `/article/${r.metadata.slug}` : undefined,
      })),
    })
  } catch (error) {
    console.error('Semantic search error:', error)
    return NextResponse.json(
      { error: 'Search failed', results: [] },
      { status: 500 }
    )
  }
}
