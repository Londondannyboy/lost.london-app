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

    // Search for memories about this user, especially their name
    const searchResponse = await fetch(`${SUPERMEMORY_API}/v4/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: 'name interest preference',
        containerTags: [userId],
        limit: 10,
      }),
    })

    if (!searchResponse.ok) {
      console.log('[Memory] Search failed:', searchResponse.status)
      return NextResponse.json({ isReturningUser: false })
    }

    const searchData = await searchResponse.json()
    const memories = searchData.results || []

    if (memories.length === 0) {
      // No memories = new user
      return NextResponse.json({ isReturningUser: false })
    }

    // Extract name from memories
    let userName = ''
    const interests: string[] = []
    const preferences: string[] = []

    for (const memory of memories) {
      const content = memory.content || ''
      const type = memory.metadata?.type || ''

      if (type === 'name' || content.toLowerCase().includes('name is')) {
        // Extract name from content like "[NAME] User's name is Dan"
        const nameMatch = content.match(/name is (\w+)/i)
        if (nameMatch) {
          userName = nameMatch[1]
        }
      } else if (type === 'interest') {
        interests.push(content.replace('[INTEREST] ', ''))
      } else if (type === 'preference') {
        preferences.push(content.replace('[PREFERENCE] ', ''))
      }
    }

    return NextResponse.json({
      isReturningUser: true,
      userName,
      interests,
      preferences,
      memoryCount: memories.length,
    })
  } catch (error) {
    console.error('[Memory] Profile fetch error:', error)
    return NextResponse.json({ isReturningUser: false })
  }
}
