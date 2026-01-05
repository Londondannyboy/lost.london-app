import { NextRequest, NextResponse } from 'next/server'
import { neonAuth } from '@neondatabase/neon-js/auth/next'
import { sql } from '@/lib/db'

/**
 * User Queries API
 * Stores and retrieves user search queries with linked articles
 */

// GET - retrieve user's query history
export async function GET(request: NextRequest) {
  try {
    const { user } = await neonAuth()
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20')

    const queries = await sql`
      SELECT
        id, query, article_id, article_title, article_slug,
        session_id, created_at
      FROM user_queries
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    ` as any[]

    // Get unique topics (deduplicated queries)
    const uniqueTopics = await sql`
      SELECT
        LOWER(query) as topic,
        COUNT(*) as count,
        MAX(created_at) as last_asked,
        MAX(article_title) as article_title,
        MAX(article_slug) as article_slug
      FROM user_queries
      WHERE user_id = ${userId}
      GROUP BY LOWER(query)
      ORDER BY count DESC, last_asked DESC
      LIMIT 10
    ` as any[]

    return NextResponse.json({
      queries,
      uniqueTopics,
      totalQueries: queries.length
    })
  } catch (error) {
    console.error('[User Queries] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch queries' }, { status: 500 })
  }
}

// POST - store a new query
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, query, articleId, articleTitle, articleSlug, sessionId } = body

    if (!userId || !query) {
      return NextResponse.json({ error: 'Missing userId or query' }, { status: 400 })
    }

    await sql`
      INSERT INTO user_queries (user_id, query, article_id, article_title, article_slug, session_id)
      VALUES (${userId}, ${query}, ${articleId || null}, ${articleTitle || null}, ${articleSlug || null}, ${sessionId || null})
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[User Queries] POST error:', error)
    return NextResponse.json({ error: 'Failed to store query' }, { status: 500 })
  }
}
