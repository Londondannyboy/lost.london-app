import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!)

    // Get all categories with counts from the new categories array column
    const categories = await sql`
      SELECT unnest(categories) as name, COUNT(*) as article_count
      FROM articles
      WHERE array_length(categories, 1) > 0
      GROUP BY 1
      ORDER BY article_count DESC
    `

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Categories error:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const { category } = await request.json()

    if (category) {
      // Get articles for specific category
      const articles = await sql`
        SELECT id, title, slug, excerpt, featured_image_url, url, author, categories
        FROM articles
        WHERE ${category} = ANY(categories)
        ORDER BY title
        LIMIT 50
      `
      return NextResponse.json({
        success: true,
        category,
        count: articles.length,
        articles: articles.map((a: any) => ({
          id: a.id,
          title: a.title,
          slug: a.slug,
          author: a.author,
          excerpt: a.excerpt?.substring(0, 200) + (a.excerpt?.length > 200 ? '...' : ''),
          url: a.url,
          featured_image_url: a.featured_image_url,
          categories: a.categories,
        })),
      })
    } else {
      // List all categories
      const categories = await sql`
        SELECT unnest(categories) as name, COUNT(*) as article_count
        FROM articles
        WHERE array_length(categories, 1) > 0
        GROUP BY 1
        ORDER BY article_count DESC
      `
      return NextResponse.json({
        success: true,
        categories: categories.map((c: any) => ({
          name: c.name,
          article_count: Number(c.article_count),
        })),
      })
    }
  } catch (error) {
    console.error('Categories error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}
