import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!)

    // Get 6 random featured articles with images
    const articles = await sql`
      SELECT id, title, slug, excerpt, featured_image_url, url, author
      FROM articles
      WHERE featured_image_url IS NOT NULL
        AND featured_image_url != ''
      ORDER BY RANDOM()
      LIMIT 6
    `

    return NextResponse.json({ articles })
  } catch (error) {
    console.error('Featured articles error:', error)
    return NextResponse.json({ error: 'Failed to fetch articles' }, { status: 500 })
  }
}
