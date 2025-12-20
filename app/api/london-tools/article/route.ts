import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json()

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const articles = await sql`
      SELECT id, title, slug, url, author, publication_date, content, excerpt, featured_image_url
      FROM articles
      WHERE title ILIKE ${'%' + title + '%'}
      ORDER BY publication_date DESC NULLS LAST
      LIMIT 1
    `

    if (articles.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Article not found',
      })
    }

    const article = articles[0]

    // Get categories for this article
    const categories = await sql`
      SELECT c.name
      FROM categories c
      JOIN article_categories ac ON c.id = ac.category_id
      WHERE ac.article_id = ${article.id}
    `

    return NextResponse.json({
      success: true,
      article: {
        title: article.title,
        author: article.author,
        publication_date: article.publication_date,
        content: article.content?.substring(0, 2000) + '...',
        excerpt: article.excerpt,
        url: article.url,
        categories: categories.map((c) => (c as { name: string }).name),
        featured_image_url: article.featured_image_url,
      },
    })
  } catch (error) {
    console.error('Article fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch article' },
      { status: 500 }
    )
  }
}
