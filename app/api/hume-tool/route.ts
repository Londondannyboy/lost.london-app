import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY

/**
 * Hume EVI Tool Endpoint
 *
 * Hume calls this endpoint directly via HTTP POST when tools are invoked.
 * This is more reliable than client-side WebSocket handling.
 */

// Phonetic corrections for voice input
const PHONETIC_CORRECTIONS: Record<string, string> = {
  'ignacio': 'ignatius', 'ignasio': 'ignatius', 'ignacius': 'ignatius',
  'thorny': 'thorney', 'fawny': 'thorney', 'fauny': 'thorney', 'forney': 'thorney',
  'tie burn': 'tyburn', 'tieburn': 'tyburn',
  'aquarim': 'aquarium', 'aquariam': 'aquarium',
  'royale': 'royal', 'cristal': 'crystal', 'crystle': 'crystal',
  'shakespear': 'shakespeare', 'shakespere': 'shakespeare',
  'westmister': 'westminster', 'white hall': 'whitehall',
  'parliment': 'parliament', 'tems': 'thames',
  'devils acre': "devil's acre", 'devil acre': "devil's acre",
}

function normalizeQuery(query: string): string {
  let normalized = query.toLowerCase().trim()
  for (const [wrong, correct] of Object.entries(PHONETIC_CORRECTIONS)) {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi')
    normalized = normalized.replace(regex, correct)
  }
  return normalized
}

async function getQueryEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: [text], model: 'voyage-2' }),
  })
  const data = await response.json()
  return data.data[0].embedding
}

async function searchKnowledge(query: string): Promise<string> {
  const normalizedQuery = normalizeQuery(query)
  console.log(`[Hume Tool] search_knowledge: "${query}" → "${normalizedQuery}"`)

  try {
    const queryEmbedding = await getQueryEmbedding(normalizedQuery)

    const results = await sql`
      WITH
      vector_results AS (
        SELECT id, 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as vector_score
        FROM knowledge_chunks
        ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT 50
      ),
      keyword_results AS (
        SELECT id,
          CASE
            WHEN LOWER(content) LIKE ${`%${normalizedQuery}%`} THEN 0.30
            WHEN LOWER(title) LIKE ${`%${normalizedQuery}%`} THEN 0.25
            WHEN LOWER(title) LIKE ${`%${normalizedQuery.split(' ')[0] || ''}%`} THEN 0.10
            ELSE 0
          END as keyword_score,
          CASE
            WHEN title LIKE 'Vic Keegan%Lost London%' THEN 0.10
            WHEN source_type = 'article' THEN 0.05
            ELSE 0
          END as type_boost
        FROM knowledge_chunks
      )
      SELECT
        kc.title, kc.content, kc.source_type, kc.metadata,
        (COALESCE(vr.vector_score, 0) * 0.6) +
        (COALESCE(kr.keyword_score, 0) * 0.4) +
        COALESCE(kr.type_boost, 0) as score
      FROM knowledge_chunks kc
      LEFT JOIN vector_results vr ON kc.id = vr.id
      LEFT JOIN keyword_results kr ON kc.id = kr.id
      WHERE vr.id IS NOT NULL OR kr.keyword_score > 0
      ORDER BY score DESC
      LIMIT 5
    `

    if (results.length === 0) {
      return `I don't have any articles about "${query}" in my knowledge base. Try asking about London history topics like Thorney Island, Shakespeare, Victorian London, hidden rivers, or Tudor history.`
    }

    // Format results for voice response
    const topResult = results[0]
    const content = topResult.content.substring(0, 1500)

    // Build response with article content
    let response = `Here's what I found about ${query}:\n\n`
    response += `ARTICLE: ${topResult.title}\n`
    response += `CONTENT: ${content}\n\n`

    // Add other relevant articles
    if (results.length > 1) {
      response += `RELATED ARTICLES:\n`
      for (let i = 1; i < Math.min(results.length, 4); i++) {
        response += `- ${results[i].title}\n`
      }
    }

    return response
  } catch (error) {
    console.error('[Hume Tool] search_knowledge error:', error)
    return `I'm having trouble searching my knowledge base right now. Please try again.`
  }
}

async function rememberUser(memory: string, type: string, userId?: string): Promise<string> {
  console.log(`[Hume Tool] remember_user: "${memory}" (type: ${type})`)

  // For now, just acknowledge - you can integrate with Supermemory later
  return `I'll remember that: ${memory}`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('========================================')
    console.log('[Hume Tool] RECEIVED REQUEST')
    console.log('[Hume Tool] Type:', body.type)
    console.log('[Hume Tool] Name:', body.name || body.tool_call_message?.name)
    console.log('[Hume Tool] Full body:', JSON.stringify(body, null, 2))
    console.log('========================================')

    // Handle both direct tool_call and webhook format
    const toolCallMessage = body.tool_call_message || body
    const toolName = toolCallMessage.name || body.name
    const toolCallId = toolCallMessage.tool_call_id || body.tool_call_id || 'unknown'
    const parameters = toolCallMessage.parameters || body.parameters

    if (!toolName) {
      return NextResponse.json({ error: 'No tool name provided' }, { status: 400 })
    }

    // Parse parameters
    let params: Record<string, any> = {}
    try {
      params = typeof parameters === 'string' ? JSON.parse(parameters) : (parameters || {})
    } catch (e) {
      console.error('[Hume Tool] Failed to parse parameters:', parameters)
    }

    console.log(`[Hume Tool] Executing: ${toolName}`, params)

    let result: string

    switch (toolName) {
      case 'search_knowledge':
        result = await searchKnowledge(params.query || '')
        break

      case 'remember_user':
        result = await rememberUser(params.memory || '', params.type || 'general', params.user_id)
        break

      default:
        result = `Unknown tool: ${toolName}. Available tools: search_knowledge, remember_user`
    }

    console.log(`[Hume Tool] Result for ${toolName}:`, result.substring(0, 200))

    // Return in Hume's expected format
    return NextResponse.json({
      type: 'tool_response',
      tool_call_id: toolCallId,
      content: result
    })
  } catch (error) {
    console.error('[Hume Tool] Error:', error)
    return NextResponse.json({
      type: 'tool_response',
      tool_call_id: 'error',
      content: `Error processing request: ${error}`
    }, { status: 500 })
  }
}

// GET for testing
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'Hume Tool - Lost London',
    tools: ['search_knowledge', 'remember_user'],
    usage: 'Configure in Hume dashboard with webhook URL: https://lost.london/api/hume-tool'
  })
}
