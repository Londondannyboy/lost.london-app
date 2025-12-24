import { NextRequest, NextResponse } from 'next/server'

const SUPERMEMORY_API = 'https://api.supermemory.ai'
const API_KEY = process.env.SUPERMEMORY_API_KEY

/**
 * Test endpoint to verify Supermemory storage is working
 * POST /api/diagnostics/test-store
 * Body: { userId: string }
 */
export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({
      success: false,
      error: 'SUPERMEMORY_API_KEY not configured',
      hint: 'Add this environment variable to Vercel',
    }, { status: 500 })
  }

  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 })
    }

    // Store a test memory
    const testContent = `Test topic storage: Roman history at ${new Date().toISOString()}`

    const response = await fetch(`${SUPERMEMORY_API}/v3/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: testContent,
        containerTag: userId,
        metadata: {
          userId,
          type: 'conversation_topic',
          topics: ['Roman history', 'test'],
          timestamp: new Date().toISOString(),
          source: 'vic_test',
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json({
        success: false,
        error: 'Supermemory API error',
        status: response.status,
        details: errorText,
      }, { status: 500 })
    }

    const result = await response.json()

    return NextResponse.json({
      success: true,
      message: 'Test memory stored successfully!',
      documentId: result.id,
      storedContent: testContent,
      userId,
      hint: 'Now check /api/diagnostics/memory?userId=' + userId,
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Failed to store test memory',
      details: error.message,
    }, { status: 500 })
  }
}
