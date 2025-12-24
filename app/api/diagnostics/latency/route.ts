import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const SUPERMEMORY_API = 'https://api.supermemory.ai'
const SUPERMEMORY_KEY = process.env.SUPERMEMORY_API_KEY
const ZEP_API_KEY = process.env.ZEP_API_KEY
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY

interface TimingResult {
  service: string
  latency_ms: number
  status: 'ok' | 'error' | 'skipped'
  details?: string
}

/**
 * Diagnostic endpoint to test latencies of all services
 * GET /api/diagnostics/latency?userId=xxx
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId') || 'test_user'
  const testQuery = 'Roman baths London history'

  const results: TimingResult[] = []

  // 1. Test Neon PostgreSQL (pgvector semantic search)
  const neonStart = Date.now()
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const articles = await sql`
      SELECT id, title, slug
      FROM articles
      WHERE title ILIKE ${'%roman%'}
      LIMIT 3
    `
    results.push({
      service: 'Neon PostgreSQL (keyword)',
      latency_ms: Date.now() - neonStart,
      status: 'ok',
      details: `Found ${articles.length} articles`,
    })
  } catch (e: any) {
    results.push({
      service: 'Neon PostgreSQL (keyword)',
      latency_ms: Date.now() - neonStart,
      status: 'error',
      details: e.message,
    })
  }

  // 2. Test Neon pgvector (if embeddings exist)
  const vectorStart = Date.now()
  try {
    const sql = neon(process.env.DATABASE_URL!)
    // Just test that the embedding column exists and is queryable
    const check = await sql`
      SELECT id, title
      FROM articles
      WHERE embedding IS NOT NULL
      LIMIT 1
    `
    results.push({
      service: 'Neon pgvector (check)',
      latency_ms: Date.now() - vectorStart,
      status: 'ok',
      details: check.length > 0 ? 'Embeddings exist' : 'No embeddings found',
    })
  } catch (e: any) {
    results.push({
      service: 'Neon pgvector (check)',
      latency_ms: Date.now() - vectorStart,
      status: 'error',
      details: e.message,
    })
  }

  // 3. Test Supermemory profile fetch
  const supermemoryStart = Date.now()
  if (SUPERMEMORY_KEY) {
    try {
      const response = await fetch(`${SUPERMEMORY_API}/v4/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPERMEMORY_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: 'topic interest article',
          containerTags: [userId],
          limit: 10,
        }),
      })
      const data = await response.json()
      results.push({
        service: 'Supermemory (profile search)',
        latency_ms: Date.now() - supermemoryStart,
        status: response.ok ? 'ok' : 'error',
        details: `Found ${data.results?.length || 0} memories`,
      })
    } catch (e: any) {
      results.push({
        service: 'Supermemory (profile search)',
        latency_ms: Date.now() - supermemoryStart,
        status: 'error',
        details: e.message,
      })
    }
  } else {
    results.push({
      service: 'Supermemory',
      latency_ms: 0,
      status: 'skipped',
      details: 'No API key configured',
    })
  }

  // 4. Test Zep (if configured)
  const zepStart = Date.now()
  if (ZEP_API_KEY) {
    try {
      const response = await fetch('https://api.getzep.com/api/v2/users', {
        method: 'GET',
        headers: {
          'Authorization': `Api-Key ${ZEP_API_KEY}`,
        },
      })
      results.push({
        service: 'Zep Cloud (users list)',
        latency_ms: Date.now() - zepStart,
        status: response.ok ? 'ok' : 'error',
        details: response.ok ? 'Connected' : `Status ${response.status}`,
      })
    } catch (e: any) {
      results.push({
        service: 'Zep Cloud',
        latency_ms: Date.now() - zepStart,
        status: 'error',
        details: e.message,
      })
    }
  } else {
    results.push({
      service: 'Zep Cloud',
      latency_ms: 0,
      status: 'skipped',
      details: 'No API key configured (ZEP disabled for speed)',
    })
  }

  // 5. Test Voyage AI (embeddings)
  const voyageStart = Date.now()
  if (VOYAGE_API_KEY) {
    try {
      const response = await fetch('https://api.voyageai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VOYAGE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'voyage-2',
          input: testQuery,
        }),
      })
      results.push({
        service: 'Voyage AI (embedding)',
        latency_ms: Date.now() - voyageStart,
        status: response.ok ? 'ok' : 'error',
        details: response.ok ? 'Generated embedding' : `Status ${response.status}`,
      })
    } catch (e: any) {
      results.push({
        service: 'Voyage AI',
        latency_ms: Date.now() - voyageStart,
        status: 'error',
        details: e.message,
      })
    }
  } else {
    results.push({
      service: 'Voyage AI',
      latency_ms: 0,
      status: 'skipped',
      details: 'No API key in frontend (CLM handles embeddings)',
    })
  }

  // Calculate total
  const totalLatency = results.reduce((sum, r) => sum + r.latency_ms, 0)

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    userId,
    testQuery,
    totalLatency_ms: totalLatency,
    results,
    notes: {
      model: 'Claude 3.5 Haiku (fast) - configured in vic-clm',
      optimizations: [
        'Parallel execution of cache/embedding/memory',
        'Streaming with filler phrases',
        'Connection pooling',
        'Fire-and-forget background tasks',
        'Zep disabled for speed',
      ],
    },
  })
}
