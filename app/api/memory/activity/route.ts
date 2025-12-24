import { NextRequest, NextResponse } from 'next/server'

const SUPERMEMORY_API = 'https://api.supermemory.ai'
const API_KEY = process.env.SUPERMEMORY_API_KEY

interface ActivityItem {
  id: string
  type: 'article_view' | 'search' | 'conversation_topic' | 'topic_interest' | 'unknown'
  content: string
  timestamp: string
  metadata: {
    articleId?: number
    articleSlug?: string
    articleTitle?: string
    categories?: string[]
    query?: string
    topics?: string[]
    [key: string]: any
  }
}

/**
 * Fetch user activity from Supermemory
 * Returns article views, searches, and conversation topics
 */
export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ success: false, error: 'API not configured' })
  }

  try {
    const { userId, limit = 50 } = await request.json()

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' })
    }

    // Fetch all memories for this user
    const searchResponse = await fetch(`${SUPERMEMORY_API}/v4/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: 'article view search topic interest conversation',
        containerTags: [userId],
        limit,
      }),
    })

    if (!searchResponse.ok) {
      console.error('[Activity] Search failed:', searchResponse.status)
      return NextResponse.json({ success: false, error: 'Failed to fetch activity' })
    }

    const searchData = await searchResponse.json()
    const memories = searchData.results || []

    // Process and categorize memories
    const activities: ActivityItem[] = []
    const articleViews: ActivityItem[] = []
    const searches: ActivityItem[] = []
    const topics: string[] = []
    const seenArticleIds = new Set<number>()

    for (const memory of memories) {
      const type = memory.metadata?.type || 'unknown'
      const timestamp = memory.metadata?.timestamp || memory.createdAt || ''

      const activity: ActivityItem = {
        id: memory.id || `${Date.now()}-${Math.random()}`,
        type,
        content: memory.content || '',
        timestamp,
        metadata: memory.metadata || {},
      }

      // Categorize by type
      if (type === 'article_view' && memory.metadata?.articleId) {
        // Deduplicate article views by ID (keep most recent)
        if (!seenArticleIds.has(memory.metadata.articleId)) {
          seenArticleIds.add(memory.metadata.articleId)
          // Extract title from content if not in metadata
          if (!activity.metadata.articleTitle) {
            const titleMatch = memory.content?.match(/viewed article: "([^"]+)"/)
            if (titleMatch) {
              activity.metadata.articleTitle = titleMatch[1]
            }
          }
          articleViews.push(activity)
        }
      } else if (type === 'search' && memory.metadata?.query) {
        searches.push(activity)
      } else if (type === 'conversation_topic' || type === 'topic_interest') {
        const memoryTopics = memory.metadata?.topics || [memory.metadata?.topic]
        memoryTopics.forEach((t: string) => {
          if (t && !topics.includes(t)) {
            topics.push(t)
          }
        })
      }

      activities.push(activity)
    }

    // Sort by timestamp (most recent first)
    const sortByTimestamp = (a: ActivityItem, b: ActivityItem) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    }

    articleViews.sort(sortByTimestamp)
    searches.sort(sortByTimestamp)

    return NextResponse.json({
      success: true,
      activities: {
        all: activities,
        articleViews: articleViews.slice(0, 20), // Last 20 unique articles
        searches: searches.slice(0, 10), // Last 10 searches
        topics: topics.slice(0, 15), // Top 15 topics
      },
      totalCount: memories.length,
    })
  } catch (error) {
    console.error('[Activity] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch activity' })
  }
}
