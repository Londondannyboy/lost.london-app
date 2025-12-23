import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY

/**
 * Phonetic corrections for common mispronunciations and accent variations
 * Maps what people might say → what's actually in the database
 */
const PHONETIC_CORRECTIONS: Record<string, string> = {
  // Names - common mispronunciations
  'ignacio': 'ignatius',
  'ignasio': 'ignatius',
  'ignacius': 'ignatius',
  'sancho': 'sancho', // keep as-is but ensure matching

  // Places - accent variations
  'thorny': 'thorney',
  'fawny': 'thorney',
  'fauny': 'thorney',
  'forney': 'thorney',
  'tyburn': 'tyburn',
  'tie burn': 'tyburn',
  'tieburn': 'tyburn',

  // Buildings
  'aquarim': 'aquarium',
  'aquariam': 'aquarium',
  'royale': 'royal',
  'cristal': 'crystal',
  'crystle': 'crystal',

  // Historical terms
  'shakespear': 'shakespeare',
  'shakespere': 'shakespeare',
  'shakspeare': 'shakespeare',
  'elizabethian': 'elizabethan',
  'elizabethen': 'elizabethan',
  'victorien': 'victorian',
  'mediaeval': 'medieval',
  'medival': 'medieval',
  'tudor': 'tudor',
  'tudors': 'tudor',

  // Common London terms
  'westminster': 'westminster',
  'westmister': 'westminster',
  'whitehall': 'whitehall',
  'white hall': 'whitehall',
  'parliament': 'parliament',
  'parliment': 'parliament',
  'thames': 'thames',
  'tems': 'thames',

  // Devils Acre variations
  'devils acre': "devil's acre",
  'devil acre': "devil's acre",
  'the devils acre': "devil's acre",
}

/**
 * Normalize query by applying phonetic corrections
 */
function normalizeQuery(query: string): string {
  let normalized = query.toLowerCase().trim()

  // Apply phonetic corrections
  for (const [wrong, correct] of Object.entries(PHONETIC_CORRECTIONS)) {
    // Use word boundary matching to avoid partial replacements
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi')
    normalized = normalized.replace(regex, correct)
  }

  return normalized
}

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

  // Normalize query for accent/mispronunciation tolerance
  const normalizedQuery = normalizeQuery(query)
  console.log(`[Search] Original: "${query}" → Normalized: "${normalizedQuery}"`)

  // Get embedding for the normalized query
  const queryEmbedding = await getQueryEmbedding(normalizedQuery)

  // HYBRID SEARCH: Combine vector similarity + full-text keyword matching
  // This is how production RAG systems work - pure vector search alone is not enough
  const results = await sql`
    WITH
    -- Vector search results
    vector_results AS (
      SELECT
        id,
        1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as vector_score
      FROM knowledge_chunks
      ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
      LIMIT 50
    ),
    -- Keyword search results (title + content matching)
    keyword_results AS (
      SELECT
        id,
        CASE
          -- Exact phrase in content = strong signal
          WHEN LOWER(content) LIKE ${`%${normalizedQuery.toLowerCase()}%`} THEN 0.30
          -- Query words in title = strong signal
          WHEN LOWER(title) LIKE ${`%${normalizedQuery.toLowerCase()}%`} THEN 0.25
          -- First word match in title
          WHEN LOWER(title) LIKE ${`%${normalizedQuery.split(' ')[0]?.toLowerCase() || ''}%`} THEN 0.10
          -- First word match in content
          WHEN LOWER(content) LIKE ${`%${normalizedQuery.split(' ')[0]?.toLowerCase() || ''}%`} THEN 0.05
          ELSE 0
        END as keyword_score,
        -- Article type boost (prefer full articles over poems/sections)
        CASE
          WHEN title LIKE 'Vic Keegan%Lost London%' THEN 0.10
          WHEN source_type = 'article' THEN 0.05
          ELSE 0
        END as type_boost
      FROM knowledge_chunks
    )
    -- Combine vector + keyword scores
    SELECT
      kc.id,
      kc.source_type,
      kc.source_id,
      kc.title,
      kc.content,
      kc.chunk_index,
      kc.metadata,
      COALESCE(vr.vector_score, 0) as vector_score,
      COALESCE(kr.keyword_score, 0) as keyword_score,
      COALESCE(kr.type_boost, 0) as type_boost,
      -- Final score: 60% vector + 40% keyword + type boost
      (COALESCE(vr.vector_score, 0) * 0.6) +
      (COALESCE(kr.keyword_score, 0) * 0.4) +
      COALESCE(kr.type_boost, 0) as final_score
    FROM knowledge_chunks kc
    LEFT JOIN vector_results vr ON kc.id = vr.id
    LEFT JOIN keyword_results kr ON kc.id = kr.id
    WHERE vr.id IS NOT NULL OR kr.keyword_score > 0
    ORDER BY
      (COALESCE(vr.vector_score, 0) * 0.6) +
      (COALESCE(kr.keyword_score, 0) * 0.4) +
      COALESCE(kr.type_boost, 0) DESC
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
    similarity: parseFloat(r.final_score || r.vector_score || 0),
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
