import { NextRequest, NextResponse } from 'next/server'
import { neonAuth } from '@neondatabase/neon-js/auth/next'
import { sql } from '@/lib/db'

/**
 * Get user's recent topics for VIC's personalized greeting
 * Returns the user's last 2-3 unique query topics with linked articles
 */

export async function GET(request: NextRequest) {
  try {
    const { user } = await neonAuth()
    if (!user?.id) {
      return NextResponse.json({ topics: [], visitCount: 0 })
    }

    const userId = user.id

    // Get unique recent topics (last 2-3)
    const recentTopics = await sql`
      SELECT
        LOWER(query) as topic,
        MAX(article_title) as article_title,
        MAX(article_slug) as article_slug,
        MAX(created_at) as last_asked,
        COUNT(*) as times_asked
      FROM user_queries
      WHERE user_id = ${userId}
      GROUP BY LOWER(query)
      ORDER BY MAX(created_at) DESC
      LIMIT 3
    ` as any[]

    // Get total visit count (unique sessions)
    const visitStats = await sql`
      SELECT
        COUNT(DISTINCT session_id) as visit_count,
        COUNT(*) as total_queries,
        MIN(created_at) as first_visit
      FROM user_queries
      WHERE user_id = ${userId}
    ` as any[]

    const stats = visitStats[0] || { visit_count: 0, total_queries: 0, first_visit: null }

    return NextResponse.json({
      topics: recentTopics.map((t: any) => ({
        topic: t.topic,
        articleTitle: t.article_title,
        articleSlug: t.article_slug,
        lastAsked: t.last_asked,
        timesAsked: parseInt(t.times_asked)
      })),
      visitCount: parseInt(stats.visit_count) || 0,
      totalQueries: parseInt(stats.total_queries) || 0,
      firstVisit: stats.first_visit,
      isReturning: (parseInt(stats.visit_count) || 0) > 1
    })
  } catch (error) {
    console.error('[Recent Topics] Error:', error)
    return NextResponse.json({ topics: [], visitCount: 0 })
  }
}
