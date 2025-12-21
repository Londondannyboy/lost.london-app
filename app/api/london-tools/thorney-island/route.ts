import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

async function searchThorneyIsland(query: string, limit: number = 5) {
  const sql = neon(process.env.DATABASE_URL!)
  const searchTerm = `%${query}%`

  const chunks = await sql`
    SELECT id, chunk_number, content
    FROM thorney_island_knowledge
    WHERE LOWER(content) LIKE LOWER(${searchTerm})
    ORDER BY chunk_number
    LIMIT ${limit}
  `

  return chunks
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || searchParams.get('query')
    const limit = parseInt(searchParams.get('limit') || '5')

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required', results: [] },
        { status: 400 }
      )
    }

    const chunks = await searchThorneyIsland(query, limit)

    return NextResponse.json({
      success: true,
      source: 'Thorney Island by Vic Keegan',
      query,
      count: chunks.length,
      results: chunks.map((c: any) => ({
        chunk_number: c.chunk_number,
        content: c.content,
        // Format content for better readability
        excerpt: c.content.substring(0, 500) + (c.content.length > 500 ? '...' : ''),
      })),
    })
  } catch (error) {
    console.error('Thorney Island search error:', error)
    return NextResponse.json(
      { error: 'Search failed', results: [] },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 5 } = await request.json()

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required', results: [] },
        { status: 400 }
      )
    }

    const chunks = await searchThorneyIsland(query, limit)

    return NextResponse.json({
      success: true,
      source: 'Thorney Island by Vic Keegan',
      query,
      count: chunks.length,
      results: chunks.map((c: any) => ({
        chunk_number: c.chunk_number,
        content: c.content,
        excerpt: c.content.substring(0, 500) + (c.content.length > 500 ? '...' : ''),
      })),
    })
  } catch (error) {
    console.error('Thorney Island search error:', error)
    return NextResponse.json(
      { error: 'Search failed', results: [] },
      { status: 500 }
    )
  }
}
