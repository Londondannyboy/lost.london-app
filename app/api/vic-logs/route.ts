import { neon } from '@neondatabase/serverless'
import { NextRequest, NextResponse } from 'next/server'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const sessionId = searchParams.get('session_id')

    let query = `
      SELECT
        id,
        created_at,
        user_query,
        normalized_query,
        articles_found,
        article_titles,
        facts_checked,
        validation_passed,
        validation_notes,
        response_text,
        confidence_score,
        session_id
      FROM vic_validation_logs
      WHERE user_query NOT LIKE '%silent%'
        AND user_query NOT LIKE '%greeting%'
    `

    const params: any[] = []

    if (sessionId) {
      query += ` AND session_id = $1`
      params.push(sessionId)
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`
    params.push(limit)

    const logs = await sql(query, params)

    return NextResponse.json({
      logs,
      count: logs.length,
    })
  } catch (error) {
    console.error('Error fetching validation logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch validation logs' },
      { status: 500 }
    )
  }
}
