import { NextRequest, NextResponse } from 'next/server'

const SUPERMEMORY_API = 'https://api.supermemory.ai'
const API_KEY = process.env.SUPERMEMORY_API_KEY

/**
 * Store a specific memory about the user (name, interests, preferences)
 */
export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ success: false, error: 'API not configured' })
  }

  try {
    const { userId, memory, type } = await request.json()

    if (!userId || !memory) {
      return NextResponse.json({ success: false, error: 'Missing required fields' })
    }

    // Format the memory with context
    const formattedMemory = type
      ? `[${type.toUpperCase()}] ${memory}`
      : memory

    const response = await fetch(`${SUPERMEMORY_API}/v3/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: formattedMemory,
        containerTag: userId,
        metadata: {
          userId,
          type: type || 'general',
          timestamp: new Date().toISOString(),
          source: 'vic_lost_london',
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Supermemory API error: ${response.status}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Memory] Remember error:', error)
    return NextResponse.json({ success: false, error: 'Failed to store memory' })
  }
}
