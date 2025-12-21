import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

async function searchArticles(query: string, limit: number = 20) {
  const sql = neon(process.env.DATABASE_URL!)
  const searchTerm = `%${query}%`

  const articles = await sql`
    SELECT id, title, slug, excerpt, featured_image_url, url, author, categories, publication_date
    FROM articles
    WHERE LOWER(title) LIKE LOWER(${searchTerm})
       OR LOWER(content) LIKE LOWER(${searchTerm})
       OR LOWER(excerpt) LIKE LOWER(${searchTerm})
    ORDER BY
      CASE WHEN LOWER(title) LIKE LOWER(${searchTerm}) THEN 0 ELSE 1 END,
      title
    LIMIT ${limit}
  `

  return articles
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || searchParams.get('query')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required', articles: [] },
        { status: 400 }
      )
    }

    const articles = await searchArticles(query, limit)

    return NextResponse.json({
      success: true,
      query,
      count: articles.length,
      articles: articles.map((a: any) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        author: a.author,
        excerpt: a.excerpt?.substring(0, 300) + (a.excerpt?.length > 300 ? '...' : ''),
        url: a.url,
        featured_image_url: a.featured_image_url,
        categories: a.categories,
        publication_date: a.publication_date,
      })),
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed', articles: [] },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 20 } = await request.json()

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required', articles: [] },
        { status: 400 }
      )
    }

    const articles = await searchArticles(query, limit)

    return NextResponse.json({
      success: true,
      query,
      count: articles.length,
      articles: articles.map((a: any) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        author: a.author,
        excerpt: a.excerpt?.substring(0, 300) + (a.excerpt?.length > 300 ? '...' : ''),
        url: a.url,
        featured_image_url: a.featured_image_url,
        categories: a.categories,
        publication_date: a.publication_date,
      })),
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed', articles: [] },
      { status: 500 }
    )
  }
}
