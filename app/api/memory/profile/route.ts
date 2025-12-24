import { NextRequest, NextResponse } from 'next/server'

const SUPERMEMORY_API = 'https://api.supermemory.ai'
const API_KEY = process.env.SUPERMEMORY_API_KEY

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    console.log('[Memory] No API key configured')
    return NextResponse.json({ isReturningUser: false })
  }

  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ isReturningUser: false })
    }

    // Search for ALL user memories - article views, interests, name, etc.
    const searchResponse = await fetch(`${SUPERMEMORY_API}/v4/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: 'article viewed interest topic name preference search',
        containerTags: [userId],
        limit: 30, // Get more to capture article views
      }),
    })

    if (!searchResponse.ok) {
      console.log('[Memory] Search failed:', searchResponse.status)
      return NextResponse.json({ isReturningUser: false })
    }

    const searchData = await searchResponse.json()
    const memories = searchData.results || []

    console.log('[Memory] Found memories for user:', memories.length)

    if (memories.length === 0) {
      // No memories = new user
      return NextResponse.json({ isReturningUser: false })
    }

    // Extract name and interests from memories
    let userName = ''
    const interests: string[] = []
    const preferences: string[] = []
    const articleTitles: string[] = []
    const seenTopics = new Set<string>()

    for (const memory of memories) {
      // Supermemory returns 'memory' field (natural language summary) or 'content'
      const content = memory.memory || memory.content || ''
      const type = memory.metadata?.type || ''
      const categories = memory.metadata?.categories || []

      // Extract user name
      if (type === 'name' || content.toLowerCase().includes('name is')) {
        const nameMatch = content.match(/name is (\w+)/i)
        if (nameMatch) {
          userName = nameMatch[1]
        }
      }

      // Extract interests from explicit interest memories
      if (type === 'interest') {
        interests.push(content.replace('[INTEREST] ', ''))
      }

      // Extract interests from article views - use categories as topics
      if (type === 'article_view') {
        const titleMatch = content.match(/viewed article: "([^"]+)"/)
        if (titleMatch && articleTitles.length < 5) {
          articleTitles.push(titleMatch[1])
        }
        if (Array.isArray(categories)) {
          categories.forEach((cat: string) => {
            if (cat && !seenTopics.has(cat.toLowerCase())) {
              seenTopics.add(cat.toLowerCase())
              interests.push(cat)
            }
          })
        }
      }

      // Extract topics from conversation memories
      if (type === 'conversation_topic' || type === 'topic_interest') {
        const topics = memory.metadata?.topics || [memory.metadata?.topic]
        topics.forEach((topic: string) => {
          if (topic && !interests.includes(topic)) {
            interests.push(topic)
          }
        })
      }

      // Extract preferences
      if (type === 'preference') {
        preferences.push(content.replace('[PREFERENCE] ', ''))
      }

      // NEW: Extract topics from natural language memory summaries
      // Supermemory's AI creates summaries like "User is interested in Roman history"
      if (!type && content) {
        // Pattern: "interested in X" or "about X topics"
        const interestedMatch = content.match(/interested in ([^,.]+)/i)
        if (interestedMatch) {
          const topic = interestedMatch[1].trim()
          if (topic && !seenTopics.has(topic.toLowerCase())) {
            seenTopics.add(topic.toLowerCase())
            interests.push(topic)
          }
        }

        // Pattern: "asked about X" or "about X topics"
        const aboutMatch = content.match(/(?:asked |talked |discussed )?about ([^,.]+?)(?:\s+topics?)?$/i)
        if (aboutMatch) {
          const topic = aboutMatch[1].trim()
          if (topic && topic.length > 2 && !seenTopics.has(topic.toLowerCase())) {
            seenTopics.add(topic.toLowerCase())
            interests.push(topic)
          }
        }
      }
    }

    console.log('[Memory] Extracted - interests:', interests.length, 'articles:', articleTitles.length)

    return NextResponse.json({
      isReturningUser: true,
      userName,
      interests: interests.slice(0, 10),
      preferences,
      recentArticles: articleTitles,
      memoryCount: memories.length,
    })
  } catch (error) {
    console.error('[Memory] Profile fetch error:', error)
    return NextResponse.json({ isReturningUser: false })
  }
}
