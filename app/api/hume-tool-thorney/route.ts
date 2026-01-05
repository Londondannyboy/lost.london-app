import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

/**
 * Thorney Island-specific Hume EVI Tool Endpoint
 *
 * This endpoint ONLY searches the Thorney Island book content.
 * For off-topic questions, it suggests visiting the main VIC.
 */

// Thorney Island topics for detecting relevance
const THORNEY_TOPICS = [
  'thorney', 'island', 'westminster', 'abbey', 'parliament', 'tyburn', 'river',
  'devil', 'acre', 'caxton', 'printing', 'gatehouse', 'prison', 'confessor',
  'edward', 'cnut', 'canute', 'monk', 'monastery', 'painted chamber', 'jewel tower',
  'victoria tower', 'supreme court', 'middlesex', 'guildhall', 'whitehall',
  'tufton', 'smith square', 'millbank', 'horseferry', 'lambeth', 'tothill',
  'petty france', 'birdcage walk', 'storey', 'gate', 'sanctuary', 'broad sanctuary',
  'dean', 'chapter', 'college garden', 'little cloister', 'pyx chamber',
]

// Phonetic corrections for voice input
const PHONETIC_CORRECTIONS: Record<string, string> = {
  'fauny': 'thorney', 'fawny': 'thorney', 'thorny': 'thorney', 'forney': 'thorney',
  'fauny island': 'thorney island', 'fawny island': 'thorney island',
  'tie burn': 'tyburn', 'tieburn': 'tyburn', 'ty burn': 'tyburn',
  'devils acre': "devil's acre", 'devil acre': "devil's acre",
  'west minster': 'westminster', 'westmister': 'westminster',
  'parliment': 'parliament', 'abby': 'abbey',
}

function normalizeQuery(query: string): string {
  let normalized = query.toLowerCase().trim()
  for (const [wrong, correct] of Object.entries(PHONETIC_CORRECTIONS)) {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi')
    normalized = normalized.replace(regex, correct)
  }
  return normalized
}

function isThorneyRelevant(query: string): boolean {
  const normalized = normalizeQuery(query)
  return THORNEY_TOPICS.some(topic => normalized.includes(topic))
}

async function searchThorneyKnowledge(query: string): Promise<string> {
  const normalizedQuery = normalizeQuery(query)
  console.log(`[Thorney Tool] search: "${query}" → "${normalizedQuery}"`)

  // Check if the query is relevant to Thorney Island
  if (!isThorneyRelevant(normalizedQuery)) {
    return `I'm specifically here to discuss my Thorney Island book - the hidden island beneath Westminster where Parliament, Westminster Abbey, and the Supreme Court now stand.

Your question about "${query}" sounds fascinating, but it's outside my Thorney Island expertise.

Would you like to:
1. Ask me about Thorney Island topics like the River Tyburn, Devil's Acre, Westminster Abbey, William Caxton, or the Gatehouse Prison?
2. Or visit my other self on the main Lost London page - he knows about all 372 of my London articles!

What would you prefer?`
  }

  try {
    const searchTerm = `%${normalizedQuery}%`

    const results = await sql`
      SELECT id, chunk_number, content
      FROM thorney_island_knowledge
      WHERE LOWER(content) LIKE LOWER(${searchTerm})
      ORDER BY chunk_number
      LIMIT 5
    `

    if (results.length === 0) {
      // Try broader search with individual words
      const words = normalizedQuery.split(/\s+/).filter(w => w.length > 3)
      if (words.length > 0) {
        const wordPattern = `%${words[0]}%`
        const fallbackResults = await sql`
          SELECT id, chunk_number, content
          FROM thorney_island_knowledge
          WHERE LOWER(content) LIKE LOWER(${wordPattern})
          ORDER BY chunk_number
          LIMIT 3
        `
        if (fallbackResults.length > 0) {
          const content = fallbackResults[0].content.substring(0, 1500)
          return `Here's what I found in my Thorney Island book:\n\nCONTENT: ${content}\n\n(From Chapter ${fallbackResults[0].chunk_number})`
        }
      }

      return `I don't have specific content about "${query}" in my Thorney Island book, but I'd love to tell you about related topics!

The book covers:
- The River Tyburn and how it formed the island
- Westminster Abbey and its 1000-year history
- Devil's Acre - Victorian London's most notorious slum
- William Caxton and the birth of English printing
- The Gatehouse Prison where poets wrote their final verses

Which of these interests you?`
    }

    // Format results
    const topResult = results[0]
    const content = topResult.content.substring(0, 1500)

    let response = `From my Thorney Island book:\n\n`
    response += `CHAPTER ${topResult.chunk_number}:\n${content}\n\n`

    // Suggest related Thorney Island topics
    const relatedTopics = getRelatedThorneyTopics(normalizedQuery)
    if (relatedTopics.length > 0) {
      response += `\nRELATED_THORNEY_TOPICS: ${relatedTopics.join(' | ')}\n`
      response += `(You might also enjoy hearing about ${relatedTopics[0]}, or perhaps ${relatedTopics[1] || relatedTopics[0]})`
    }

    return response
  } catch (error) {
    console.error('[Thorney Tool] search error:', error)
    return `I'm having trouble searching my Thorney Island book right now. Please try again.`
  }
}

function getRelatedThorneyTopics(query: string): string[] {
  // Map topics to related topics within Thorney Island
  const topicRelations: Record<string, string[]> = {
    'tyburn': ['Westminster Abbey', "Devil's Acre", 'the hidden rivers'],
    'westminster': ['Edward the Confessor', 'the Painted Chamber', 'Parliament'],
    'abbey': ['King Cnut', 'the monks of Thorney', 'coronations'],
    'devil': ['Victorian slums', 'the Gatehouse Prison', 'Old Pye Street'],
    'caxton': ['English printing', 'the Almonry', 'Westminster'],
    'gatehouse': ['prison poetry', 'Sir Walter Raleigh', "Devil's Acre"],
    'parliament': ['the Painted Chamber', 'Westminster Hall', 'the Jewel Tower'],
    'river': ['the Tyburn', 'the Thames', 'how Thorney became an island'],
    'prison': ['the Gatehouse', 'Tothill Fields', 'Millbank Penitentiary'],
    'monk': ['the Abbey', 'Edward the Confessor', 'the medieval island'],
  }

  for (const [key, related] of Object.entries(topicRelations)) {
    if (query.includes(key)) {
      return related.slice(0, 2)
    }
  }

  // Default suggestions
  return ['the River Tyburn', 'Westminster Abbey']
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('========================================')
    console.log('[Thorney Tool] RECEIVED REQUEST')
    console.log('[Thorney Tool] Full body:', JSON.stringify(body, null, 2))
    console.log('========================================')

    const toolCallMessage = body.tool_call_message || body
    const toolName = toolCallMessage.name || body.name
    const toolCallId = toolCallMessage.tool_call_id || body.tool_call_id || 'unknown'
    const parameters = toolCallMessage.parameters || body.parameters

    if (!toolName) {
      return NextResponse.json({ error: 'No tool name provided' }, { status: 400 })
    }

    let params: Record<string, any> = {}
    try {
      params = typeof parameters === 'string' ? JSON.parse(parameters) : (parameters || {})
    } catch (e) {
      console.error('[Thorney Tool] Failed to parse parameters:', parameters)
    }

    console.log(`[Thorney Tool] Executing: ${toolName}`, params)

    let result: string

    switch (toolName) {
      case 'search_thorney_island':
      case 'search_knowledge':
        result = await searchThorneyKnowledge(params.query || '')
        break

      default:
        result = `Unknown tool: ${toolName}. Available tool: search_thorney_island`
    }

    console.log(`[Thorney Tool] Result:`, result.substring(0, 200))

    return NextResponse.json({
      type: 'tool_response',
      tool_call_id: toolCallId,
      content: result
    })
  } catch (error) {
    console.error('[Thorney Tool] Error:', error)
    return NextResponse.json({
      type: 'tool_response',
      tool_call_id: 'error',
      content: `Error processing request: ${error}`
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'Hume Tool - Thorney Island (VIC)',
    tools: ['search_thorney_island'],
    description: 'Thorney Island book-specific VIC endpoint. Only searches Thorney Island content.',
    usage: 'Configure in Hume dashboard with webhook URL: https://lost.london/api/hume-tool-thorney'
  })
}
