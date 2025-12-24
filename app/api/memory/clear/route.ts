import { NextRequest, NextResponse } from 'next/server'

const SUPERMEMORY_API = 'https://api.supermemory.ai'
const API_KEY = process.env.SUPERMEMORY_API_KEY

/**
 * Clear user's activity history from Supermemory
 * Uses bulk delete by container tag (userId)
 */
export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ success: false, error: 'API not configured' })
  }

  try {
    const { userId, clearType = 'all' } = await request.json()

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' })
    }

    // First, fetch all documents for this user to get their IDs
    const searchResponse = await fetch(`${SUPERMEMORY_API}/v4/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: '*', // Match all
        containerTags: [userId],
        limit: 100,
      }),
    })

    if (!searchResponse.ok) {
      console.error('[Clear] Search failed:', searchResponse.status)
      return NextResponse.json({ success: false, error: 'Failed to fetch activity' })
    }

    const searchData = await searchResponse.json()
    const memories = searchData.results || []

    if (memories.length === 0) {
      return NextResponse.json({ success: true, message: 'No activity to clear', deletedCount: 0 })
    }

    // Filter by type if specified
    let toDelete = memories
    if (clearType === 'article_views') {
      toDelete = memories.filter((m: any) => m.metadata?.type === 'article_view')
    } else if (clearType === 'searches') {
      toDelete = memories.filter((m: any) => m.metadata?.type === 'search')
    } else if (clearType === 'topics') {
      toDelete = memories.filter((m: any) =>
        m.metadata?.type === 'conversation_topic' || m.metadata?.type === 'topic_interest'
      )
    }

    const documentIds = toDelete.map((m: any) => m.id).filter(Boolean)

    if (documentIds.length === 0) {
      return NextResponse.json({ success: true, message: 'No matching activity to clear', deletedCount: 0 })
    }

    // Bulk delete documents
    const deleteResponse = await fetch(`${SUPERMEMORY_API}/v3/documents/bulk`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ids: documentIds,
      }),
    })

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text()
      console.error('[Clear] Delete failed:', deleteResponse.status, errorText)
      return NextResponse.json({ success: false, error: 'Failed to clear activity' })
    }

    console.log(`[Clear] Deleted ${documentIds.length} memories for user ${userId.substring(0, 20)}...`)

    return NextResponse.json({
      success: true,
      message: `Cleared ${documentIds.length} items`,
      deletedCount: documentIds.length,
    })
  } catch (error) {
    console.error('[Clear] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to clear activity' })
  }
}
