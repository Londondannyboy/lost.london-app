import { NextRequest, NextResponse } from 'next/server'

const SUPERMEMORY_API = 'https://api.supermemory.ai'
const API_KEY = process.env.SUPERMEMORY_API_KEY

/**
 * Track user activity (article views, searches, topics)
 * This builds a rich user profile over time
 */
export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ success: false, error: 'API not configured' })
  }

  try {
    const { userId, type, data } = await request.json()

    if (!userId || !type || !data) {
      return NextResponse.json({ success: false, error: 'Missing required fields' })
    }

    // Format the memory based on type
    let content = ''
    let metadata: Record<string, any> = {
      userId,
      type,
      timestamp: new Date().toISOString(),
      source: 'vic_lost_london',
    }

    switch (type) {
      case 'article_view':
        content = `User viewed article: "${data.title}" about ${data.categories?.join(', ') || 'London history'}`
        metadata.articleId = data.id
        metadata.articleSlug = data.slug
        metadata.categories = data.categories
        break

      case 'search':
        content = `User searched for: "${data.query}"`
        metadata.query = data.query
        metadata.resultsCount = data.resultsCount
        break

      case 'topic_interest':
        content = `User showed interest in: ${data.topic}`
        metadata.topic = data.topic
        break

      case 'conversation_topic':
        content = `User discussed: ${data.topics?.join(', ') || data.topic}`
        metadata.topics = data.topics || [data.topic]
        break

      default:
        content = `User activity: ${JSON.stringify(data)}`
    }

    const response = await fetch(`${SUPERMEMORY_API}/v3/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content,
        containerTag: userId,
        metadata,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Memory Track] API error:', response.status, errorText)
      return NextResponse.json({ success: false, error: `API error: ${response.status}` })
    }

    const result = await response.json()
    console.log(`[Memory Track] Stored ${type} for user ${userId.substring(0, 20)}...`)

    return NextResponse.json({ success: true, documentId: result.id })
  } catch (error) {
    console.error('[Memory Track] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to track activity' })
  }
}
