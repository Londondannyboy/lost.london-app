import { NextRequest, NextResponse } from 'next/server'

const SUPERMEMORY_API = 'https://api.supermemory.ai'
const API_KEY = process.env.SUPERMEMORY_API_KEY

/**
 * Diagnostic endpoint to check Supermemory status and user data
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId')

  const status = {
    configured: !!API_KEY,
    apiKeyPrefix: API_KEY ? `${API_KEY.substring(0, 8)}...` : null,
    userId: userId || null,
    memories: [] as any[],
    memoryCount: 0,
    error: null as string | null,
  }

  if (!API_KEY) {
    status.error = 'SUPERMEMORY_API_KEY not configured'
    return NextResponse.json(status)
  }

  if (!userId) {
    // Just return config status without user data
    return NextResponse.json(status)
  }

  try {
    // Search for all memories for this user
    const searchResponse = await fetch(`${SUPERMEMORY_API}/v4/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: '*',
        containerTags: [userId],
        limit: 20,
      }),
    })

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      status.error = `Search failed: ${searchResponse.status} - ${errorText}`
      return NextResponse.json(status)
    }

    const searchData = await searchResponse.json()
    status.memories = (searchData.results || []).map((m: any) => ({
      content: m.content?.substring(0, 200) + (m.content?.length > 200 ? '...' : ''),
      type: m.metadata?.type,
      timestamp: m.metadata?.timestamp,
      score: m.score,
    }))
    status.memoryCount = status.memories.length

    return NextResponse.json(status)
  } catch (error) {
    status.error = `Exception: ${error instanceof Error ? error.message : String(error)}`
    return NextResponse.json(status)
  }
}
