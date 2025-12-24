import { NextRequest, NextResponse } from 'next/server'

const SUPERMEMORY_API = 'https://api.supermemory.ai'
const API_KEY = process.env.SUPERMEMORY_API_KEY

/**
 * Diagnostic endpoint to view what's stored in Supermemory for a user
 * GET /api/diagnostics/memory?userId=xxx
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId parameter required' }, { status: 400 })
  }

  if (!API_KEY) {
    return NextResponse.json({ error: 'Supermemory API key not configured' }, { status: 500 })
  }

  try {
    // Search for ALL memories for this user
    const searchResponse = await fetch(`${SUPERMEMORY_API}/v4/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: '*', // Match all
        containerTags: [userId],
        limit: 50, // Get lots of results
      }),
    })

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      return NextResponse.json({
        error: 'Supermemory API error',
        status: searchResponse.status,
        details: errorText,
      }, { status: 500 })
    }

    const searchData = await searchResponse.json()
    const memories = searchData.results || []

    // Categorize memories
    const categorized = {
      article_views: [] as any[],
      conversation_topics: [] as any[],
      searches: [] as any[],
      names: [] as any[],
      interests: [] as any[],
      preferences: [] as any[],
      other: [] as any[],
    }

    for (const memory of memories) {
      const type = memory.metadata?.type || 'unknown'
      const summary = {
        id: memory.id,
        type,
        content: memory.content?.substring(0, 200) + (memory.content?.length > 200 ? '...' : ''),
        timestamp: memory.metadata?.timestamp || memory.createdAt,
        metadata: memory.metadata,
      }

      switch (type) {
        case 'article_view':
          categorized.article_views.push(summary)
          break
        case 'conversation_topic':
        case 'topic_interest':
          categorized.conversation_topics.push(summary)
          break
        case 'search':
          categorized.searches.push(summary)
          break
        case 'name':
          categorized.names.push(summary)
          break
        case 'interest':
          categorized.interests.push(summary)
          break
        case 'preference':
          categorized.preferences.push(summary)
          break
        default:
          categorized.other.push(summary)
      }
    }

    // Extract topics for easy viewing
    const allTopics = new Set<string>()
    for (const memory of memories) {
      const topics = memory.metadata?.topics || []
      const categories = memory.metadata?.categories || []
      topics.forEach((t: string) => allTopics.add(t))
      categories.forEach((c: string) => allTopics.add(c))
    }

    return NextResponse.json({
      userId,
      totalMemories: memories.length,
      extractedTopics: Array.from(allTopics),
      summary: {
        article_views: categorized.article_views.length,
        conversation_topics: categorized.conversation_topics.length,
        searches: categorized.searches.length,
        names: categorized.names.length,
        interests: categorized.interests.length,
        preferences: categorized.preferences.length,
        other: categorized.other.length,
      },
      memories: categorized,
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to fetch memories',
      details: error.message,
    }, { status: 500 })
  }
}
