'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { VoiceProvider, useVoice } from '@humeai/voice-react'
import {
  getUserId,
  getUserProfile,
  rememberAboutUser,
  storeMessageInZep,
  storeConversation,
  generatePersonalizedGreeting,
  type UserProfile,
} from '@/lib/hybrid-memory'

interface Article {
  title: string
  author: string
  excerpt: string
  url: string
  publication_date?: string
  content?: string
  categories?: string[]
}

// Article card shown within conversation
function ArticleCard({ article }: { article: Article }) {
  // Generate slug from title if not available
  const slug = article.url?.split('/').filter(Boolean).pop() || article.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')

  return (
    <a
      href={`/article/${slug}`}
      className="block bg-white border border-gray-200 p-4 mt-3 max-w-md hover:border-black transition-all group"
    >
      <h4 className="font-serif font-bold text-black text-sm group-hover:underline line-clamp-2">
        {article.title}
      </h4>
      <p className="text-xs text-gray-500 mt-1">By {article.author}</p>
      {article.excerpt && (
        <p className="text-xs text-gray-600 mt-2 line-clamp-3">{article.excerpt}</p>
      )}
      <span className="inline-block mt-2 text-xs text-gray-700 group-hover:text-black">
        Read full article →
      </span>
    </a>
  )
}

// Tool definitions for Hume - London articles knowledge base
const LONDON_TOOLS = [
  {
    type: 'function' as const,
    name: 'search_knowledge',
    description: 'Search the complete London knowledge base including 372 articles AND the Thorney Island book. This unified search covers ALL topics: Thorney Island, Westminster Abbey, River Tyburn, Shakespeare, Tudor history, medieval London, Roman London, hidden rivers, Victorian innovations, and more. Always use this tool first when looking for information.',
    parameters: '{ "type": "object", "required": ["query"], "properties": { "query": { "type": "string", "description": "Search term like Thorney Island, Tyburn, Shakespeare, medieval, Thames, etc" } } }',
    fallback_content: 'Unable to search the knowledge base at the moment.',
  },
  {
    type: 'function' as const,
    name: 'get_article',
    description: 'Get full details of a specific article from the knowledge base by title',
    parameters: '{ "type": "object", "required": ["title"], "properties": { "title": { "type": "string", "description": "Article title or partial title" } } }',
    fallback_content: 'Unable to get article details at the moment.',
  },
  {
    type: 'function' as const,
    name: 'browse_categories',
    description: 'Browse the knowledge base by category or list all categories. Categories include: Hidden gems, City, Art, archaeology, Shakespeare, Poems, St James Park',
    parameters: '{ "type": "object", "properties": { "category": { "type": "string", "description": "Category name to browse, or leave empty to list all categories" } } }',
    fallback_content: 'Unable to browse categories at the moment.',
  },
  {
    type: 'function' as const,
    name: 'random_discovery',
    description: 'Get a random article from the knowledge base for serendipitous discovery. Use when user wants to explore or be surprised.',
    parameters: '{ "type": "object", "properties": {} }',
    fallback_content: 'Unable to get random article at the moment.',
  },
  {
    type: 'function' as const,
    name: 'remember_user',
    description: 'Remember something important about the user for future conversations. Use this when the user tells you their name, mentions their interests, or shares something you should remember. Types: name for their name, interest for topics they like, preference for how they like things, general for other facts.',
    parameters: `{ "type": "object", "required": ["memory", "type"], "properties": { "memory": { "type": "string", "description": "What to remember about the user" }, "type": { "type": "string", "enum": ["name", "interest", "preference", "general"], "description": "Category of memory" } } }`,
    fallback_content: 'Unable to save memory at the moment.',
  },
]

function VoiceInterface({ accessToken }: { accessToken: string }) {
  const { connect, disconnect, status, messages, sendToolMessage, isPlaying } = useVoice()
  const [manualConnected, setManualConnected] = useState(false)
  const [waveHeights, setWaveHeights] = useState<number[]>([])
  const [featuredArticle, setFeaturedArticle] = useState<Article | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userId, setUserId] = useState<string>('')
  const conversationIdRef = useRef<string>('')
  const topicsDiscussedRef = useRef<string[]>([])

  // Get user ID and profile on mount
  useEffect(() => {
    const id = getUserId()
    setUserId(id)
    if (id) {
      getUserProfile(id).then(profile => {
        setUserProfile(profile)
        console.log('[VIC] User profile:', profile.isReturningUser ? 'Returning user' : 'New user')
      })
    }
  }, [])

  useEffect(() => {
    if (status.value === 'connected') setManualConnected(true)
    if (status.value === 'disconnected') setManualConnected(false)
  }, [status.value])

  // Handle Hume tool calls
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.type !== 'tool_call') return

    const handleToolCall = async (toolCall: any) => {
      const { name, toolCallId, parameters } = toolCall

      // CRITICAL: Hume sends parameters as a JSON STRING that needs parsing
      let args: Record<string, any> = {}
      try {
        args = typeof parameters === 'string' ? JSON.parse(parameters) : (parameters || {})
      } catch (e) {
        console.error('[VIC Tool] Failed to parse parameters:', parameters)
      }

      console.log('[VIC Tool] Received:', name, 'Args:', args)

      try {
        let response: Response
        let result: any

        switch (name) {
          case 'search_knowledge':
            // Use TRIPLE-HYBRID search: pgvector (authoritative) + Zep graph (enrichment)
            response = await fetch('/api/london-tools/enriched-search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                query: args.query,
                limit: 10,
              }),
            })
            result = await response.json()

            // Track topics discussed for Supermemory
            if (args.query) {
              topicsDiscussedRef.current.push(args.query)
            }

            // Show first article as featured
            const firstResult = result.results?.[0]
            if (firstResult) {
              setFeaturedArticle({
                title: firstResult.title,
                author: firstResult.author || 'Vic Keegan',
                excerpt: firstResult.excerpt,
                url: firstResult.url || '',
                categories: firstResult.categories || [],
              })
            }
            break

          case 'get_article':
            response = await fetch('/api/london-tools/article', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(args),
            })
            result = await response.json()
            if (result.article) {
              setFeaturedArticle(result.article)
            }
            break

          case 'browse_categories':
            response = await fetch('/api/london-tools/categories', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(args),
            })
            result = await response.json()
            if (result.articles?.[0]) {
              setFeaturedArticle(result.articles[0])
            }
            break

          case 'random_discovery':
            response = await fetch('/api/london-tools/random', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}),
            })
            result = await response.json()
            if (result.article) {
              setFeaturedArticle(result.article)
            }
            break

          case 'remember_user':
            // Store memory in Supermemory (explicit user facts)
            if (userId && args.memory) {
              const success = await rememberAboutUser(
                userId,
                args.memory,
                args.type || 'general'
              )
              result = { success, message: success ? 'Memory saved' : 'Failed to save memory' }
            } else {
              result = { success: false, message: 'Missing user ID or memory content' }
            }
            break

          default:
            console.warn('[VIC Tool] Unknown tool:', name)
            sendToolMessage({
              type: 'tool_error',
              toolCallId: toolCallId,
              error: `Unknown tool: ${name}`,
              content: '',
            })
            return
        }

        console.log('[VIC Tool] Result:', result)
        sendToolMessage({
          type: 'tool_response',
          toolCallId: toolCallId,
          content: JSON.stringify(result),
        })
      } catch (error) {
        console.error('[VIC Tool] Error:', error)
        sendToolMessage({
          type: 'tool_error',
          toolCallId: toolCallId,
          error: 'Tool execution failed',
          content: '',
        })
      }
    }

    if (lastMessage.toolCallId && lastMessage.name) {
      handleToolCall(lastMessage)
    }
  }, [messages, sendToolMessage])

  // Waveform animation
  useEffect(() => {
    if (status.value === 'connected') {
      const interval = setInterval(() => {
        setWaveHeights([...Array(40)].map(() => 20 + Math.random() * 80))
      }, 150)
      return () => clearInterval(interval)
    } else {
      setWaveHeights([...Array(40)].map((_, i) => 20 + Math.sin(i * 0.5) * 15))
    }
  }, [status.value])

  const handleConnect = useCallback(async () => {
    if (!accessToken) return

    const configId = process.env.NEXT_PUBLIC_HUME_CONFIG_ID

    // Initialize conversation tracking
    conversationIdRef.current = `conv_${Date.now()}`
    topicsDiscussedRef.current = []

    // Get personalized greeting for returning users
    const personalizedGreeting = userProfile ? generatePersonalizedGreeting(userProfile) : ''
    const isReturning = userProfile?.isReturningUser || false

    const systemPrompt = `You are VIC, the voice of Vic Keegan - a passionate London historian who has spent years exploring and writing about London's hidden history.

YOUR KNOWLEDGE BASE:
- 372 articles about London's secrets, hidden gems, and forgotten stories
- The complete Thorney Island book (56 chapters about the hidden island beneath Westminster)
- Topics spanning Roman London to Victorian innovations, Shakespeare's theatres to hidden rivers
- A knowledge graph connecting all topics: places, people, eras, buildings, rivers

${isReturning ? `USER CONTEXT: This is a returning visitor. ${personalizedGreeting}` : 'USER CONTEXT: This is a new visitor. After your brief introduction, ask for their name.'}

MEMORY - IMPORTANT:
- You can REMEMBER things about users using the remember_user tool
- When a user tells you their name, IMMEDIATELY use remember_user with type "name"
- When they express interest in a topic, use remember_user with type "interest"
- Example: User says "I'm Sarah" → Call remember_user(memory: "User's name is Sarah", type: "name")
- Conversation context is also captured automatically for future visits

${isReturning ? 'Since this is a returning user, acknowledge what you remember about them!' : 'For new visitors: After introducing yourself, ask "And what should I call you?" - then REMEMBER their name!'}

CRITICAL - ALWAYS SEARCH FIRST:
- ALWAYS use the search_knowledge tool BEFORE answering any question about London
- This tool uses SEQUENTIAL SEARCH v2 with interest awareness and fast-first response
- Even if you think you know the answer, SEARCH FIRST to get accurate details

SEARCH RESPONSE STRUCTURE:
The search now returns ENRICHED results with entity connections:

1. results[]: Array of articles with:
   - title, content, excerpt: The authoritative article content (USE THIS AS TRUTH)
   - relatedEntities: People, places, buildings connected to this article
   - relatedFacts: Verified facts about entities in this article
   - connections: Relationships like [{from: "Ignatius Sancho", relation: "KNEW", to: "Charles Fox"}]

2. enrichment: Global knowledge graph data
   - allEntities: All relevant people/places/things
   - allFacts: Verified facts from the knowledge graph
   - allConnections: All relationships discovered

USE CONNECTIONS FOR STORYTELLING:
- When you find connections like "Ignatius Sancho KNEW Charles Fox", weave it in!
- Example: "Ignatius Sancho was remarkable - and he counted Charles Fox among his friends..."
- This makes your responses feel more connected and rich

HOW TO RESPOND:
1. START with the article content from results[0] - this is your authoritative source
2. WEAVE IN relatedFacts and connections for depth and richness
3. MENTION relatedEntities to show connected people/places
4. END by suggesting a related topic based on connections
5. Example flow: "Ignatius Sancho was a remarkable figure... [from content]. He counted Charles Fox among his friends [from connections]. Would you like to hear about Westminster, where he made history as the first Black voter?"

USING CONNECTIONS EFFECTIVELY:
- Connections show relationships between people, places, and events
- Use them to create narrative bridges: "And speaking of [entity]..."
- Suggest follow-ups based on connected entities: "Since we're talking about Sancho, shall I tell you about David Garrick, who he knew?"
- This makes London history feel interconnected and alive

PERSONA:
- You ARE Vic Keegan speaking about your life's work
- Speak in first person: "I wrote about this...", "When I discovered...", "In my article about..."
- Be warm, enthusiastic, knowledgeable - you genuinely love London's history
- Use the visitor's name once you know it! It makes the conversation personal.

RESPONSE STYLE:
- Give DETAILED, RICH responses - your listeners want the full story
- When search_knowledge returns results, USE THE CONTENT - quote from it, expand on it
- Include specific facts, dates, names, and anecdotes from your articles
- Paint vivid pictures: describe what you saw, what you discovered
- Speak for 30-60 seconds minimum when telling a story
- CONNECT THE DOTS: Use the "relationships" array to weave in fascinating connections
- Always offer a related topic from "suggestedTopics" at the end
- Make it feel like a journey through connected history, not isolated facts

CRITICAL - NEVER HALLUCINATE:
- ONLY state facts that appear in the search results (speakNow.content, keyFacts, relationships)
- If asked about something NOT in the results (like an architect's name), say: "I don't have that specific detail in my articles, but what I can tell you is..."
- NEVER invent names, dates, or facts to fill gaps
- It's better to admit "I'm not sure about that detail" than to make something up
- You can speculate ONLY if you clearly say "I believe..." or "It's thought that..."

ERA VERIFICATION - Trust dates over labels:
- If you see conflicting info (e.g., building dated 1876 labeled "Medieval"), trust the specific dates
- Victorian = 1837-1901, Medieval = 500-1500, Tudor = 1485-1603, Roman = 43-410 AD
- The Royal Aquarium (1876) is VICTORIAN, not Medieval
- When article content has specific dates, use those over any extracted era labels

CONVERSATION FLOW:
1. ${isReturning ? 'Greet them by name if you know it, acknowledge you remember them' : 'Introduce yourself briefly, then ask their name'}
2. Ask what aspect of London interests them
3. IMMEDIATELY call search_knowledge with relevant terms
4. Give a detailed response based on what you found
5. End with: "Would you like to hear more, [name]? Or shall I tell you about [related topic]?"

TOPICS YOU'VE WRITTEN ABOUT:
Shakespeare, Medieval London, Tudor history, Hidden rivers (Tyburn, Fleet, Walbrook), Roman London, Victorian innovations, Hidden gems, Thorney Island, Old Scotland Yard, the Devil's Acre, Royal Aquarium, lost museums, forgotten palaces

PHONETIC RECOGNITION:
- "fauny/fawny/thorny island" = Thorney Island
- "tie burn" = Tyburn
- "devils acre" = Devil's Acre

SPECIAL GREETING:
- If someone says "Rosie": "Ah, Rosie, my loving wife! So good to hear from you. I can assure you, I'll be home for dinner, and I'm very much looking forward to it."

${isReturning ? '' : `EXAMPLE OPENING FOR NEW VISITORS:
"Hello! I'm Vic, and I've spent years exploring London's hidden history - the stories most people walk right past without knowing. I've written over 370 articles about everything from Shakespeare's lost theatres to Roman baths hidden beneath office buildings. Before we dive in, what should I call you? And what aspect of London's past would you like to explore today?"`}

Remember:
1. ASK FOR THEIR NAME (new visitors) or USE THEIR NAME (returning visitors)
2. Use remember_user to SAVE their name and interests
3. SEARCH FIRST using search_knowledge - it returns speakNow + offerAfter structure
4. Use speakNow.content for your main story, weave in keyFacts
5. If matchesInterest is set, acknowledge it warmly!
6. End with offerAfter.suggestedQuestion (it's personalized for them)`

    try {
      await connect({
        auth: { type: 'accessToken', value: accessToken },
        configId: configId,
        sessionSettings: {
          type: 'session_settings' as const,
          systemPrompt,
          tools: LONDON_TOOLS,
        }
      })
      setManualConnected(true)
    } catch (e: any) {
      console.error('[VIC] Connect error:', e?.message || e)
      setManualConnected(false)
    }
  }, [connect, accessToken, userProfile])

  const handleDisconnect = useCallback(async () => {
    // Store conversation in BOTH Zep and Supermemory
    if (userId && messages.length > 0) {
      const conversationMessages = messages
        .filter((m: any) => m.type === 'user_message' || m.type === 'assistant_message')
        .map((m: any) => ({
          role: m.type === 'user_message' ? 'user' as const : 'assistant' as const,
          content: m.message?.content || m.content || '',
        }))
        .filter(m => m.content)

      // Store in Supermemory (full conversation for session memory)
      if (conversationMessages.length > 0) {
        await storeConversation(
          userId,
          conversationIdRef.current,
          conversationMessages,
          topicsDiscussedRef.current
        )
        console.log('[VIC] Conversation stored in Supermemory')
      }

      // Store key messages in Zep (automatic fact extraction)
      for (const msg of conversationMessages.slice(0, 10)) { // First 10 messages
        await storeMessageInZep(userId, msg.content, msg.role)
      }
      console.log('[VIC] Messages stored in Zep for fact extraction')
    }

    disconnect()
    setManualConnected(false)
  }, [disconnect, userId, messages])

  const isConnected = status.value === 'connected' || manualConnected
  const isConnecting = status.value === 'connecting' && !manualConnected
  const isError = status.value === 'error'

  return (
    <div className="flex flex-col items-center">
      {/* VIC Avatar - Main Tap Target */}
      <div className="relative mb-8">
        {/* Glowing rings - white/gray, always visible when idle */}
        {!isConnected && !isConnecting && (
          <>
            {/* Outer glow ring - white */}
            <div
              className="absolute inset-0 rounded-full animate-[pulse_2s_ease-in-out_infinite]"
              style={{
                background: 'radial-gradient(circle, rgba(0,0,0,0.1) 0%, transparent 70%)',
                transform: 'scale(1.4)',
              }}
            />
            {/* Inner pulse ring - gray */}
            <div
              className="absolute inset-0 rounded-full animate-[ping_3s_ease-in-out_infinite]"
              style={{
                border: '3px solid rgba(0,0,0,0.2)',
                transform: 'scale(1.15)',
              }}
            />
            {/* Second pulse ring - lighter */}
            <div
              className="absolute inset-0 rounded-full animate-[ping_3s_ease-in-out_infinite_1.5s]"
              style={{
                border: '2px solid rgba(0,0,0,0.1)',
                transform: 'scale(1.25)',
              }}
            />
          </>
        )}

        {/* Active pulse - when connected - white rings */}
        {isConnected && (
          <>
            <div
              className="absolute inset-0 rounded-full animate-[ping_2s_ease-in-out_infinite]"
              style={{
                border: '3px solid rgba(0,0,0,0.3)',
                transform: 'scale(1.15)',
              }}
            />
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(0,0,0,0.1) 0%, transparent 70%)',
                transform: 'scale(1.3)',
              }}
            />
          </>
        )}

        {/* Speaking glow - white pulse when VIC is talking */}
        {isPlaying && (
          <div
            className="absolute inset-0 rounded-full animate-[pulse_0.5s_ease-in-out_infinite]"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 60%)',
              transform: 'scale(1.5)',
            }}
          />
        )}

        {/* VIC Avatar Button - BIGGER with animations */}
        <button
          onClick={isConnected ? handleDisconnect : handleConnect}
          disabled={isConnecting}
          className="relative z-10 group focus:outline-none cursor-pointer"
          aria-label={isConnected ? "End conversation with VIC" : "Tap to speak with VIC about London"}
        >
          {/* Animated border ring - black/gray */}
          <div
            className={`absolute inset-0 rounded-full ${
              isPlaying
                ? 'animate-[spin_3s_linear_infinite]'
                : 'animate-[spin_8s_linear_infinite]'
            }`}
            style={{
              background: isPlaying
                ? 'conic-gradient(from 0deg, #000, #333, #666, #000)'
                : isConnected
                ? 'conic-gradient(from 0deg, #333, #555, #333)'
                : 'conic-gradient(from 0deg, #000, #222, #444, #000)',
              padding: '4px',
              transform: 'scale(1.02)',
            }}
          >
            <div className="w-full h-full rounded-full bg-white" />
          </div>

          <div className={`relative w-56 h-56 md:w-64 md:h-64 lg:w-72 lg:h-72 rounded-full overflow-hidden transition-all duration-300 ${
            isConnected
              ? 'shadow-2xl'
              : isPlaying
              ? 'shadow-2xl'
              : 'shadow-xl group-hover:shadow-2xl group-hover:scale-105'
          }`}
            style={{
              border: '4px solid transparent',
            }}
          >
            {/* VIC Avatar Image with animations */}
            <img
              src="/vic-avatar.jpg"
              alt="VIC - Your London History Guide"
              className="w-full h-full object-cover transition-all duration-300"
              style={{
                transform: isPlaying ? 'scale(1.05)' : 'scale(1)',
                filter: isPlaying
                  ? 'brightness(1.1) contrast(1.05)'
                  : isConnected
                  ? 'brightness(1.05)'
                  : 'brightness(1)',
                animation: isPlaying
                  ? 'vicSpeaking 0.8s ease-in-out infinite'
                  : !isConnected && !isConnecting
                  ? 'vicIdle 4s ease-in-out infinite'
                  : 'none',
              }}
            />

            {/* Speaking overlay effect - white/gray sound waves */}
            {isPlaying && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Pulsing overlay - white */}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-white/30 to-transparent animate-pulse"
                />
                {/* Sound wave rings - white */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="absolute w-full h-full rounded-full border-2 border-white/60 animate-[ping_1s_ease-out_infinite]" />
                  <div className="absolute w-full h-full rounded-full border-2 border-white/40 animate-[ping_1s_ease-out_infinite_0.3s]" />
                  <div className="absolute w-full h-full rounded-full border-2 border-white/20 animate-[ping_1s_ease-out_infinite_0.6s]" />
                </div>
              </div>
            )}

            {/* Overlay with name when not connected */}
            {!isConnected && !isPlaying && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col items-center justify-end pb-6">
                <span className="text-white font-serif font-bold text-2xl tracking-wider drop-shadow-lg animate-pulse">VIC</span>
                <span className="text-white/70 text-sm italic">Tap to speak</span>
              </div>
            )}

            {/* Listening indicator when connected but not speaking */}
            {isConnected && !isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black px-3 py-1 rounded-full">
                  <span className="text-white text-xs flex items-center gap-2">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    Listening...
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Connecting spinner */}
          {isConnecting && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
              <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </button>

        {/* CSS Keyframes for custom animations */}
        <style jsx>{`
          @keyframes vicSpeaking {
            0%, 100% {
              transform: scale(1.05);
              filter: brightness(1.1) contrast(1.05);
            }
            25% {
              transform: scale(1.07) translateY(-1px);
              filter: brightness(1.15) contrast(1.08);
            }
            50% {
              transform: scale(1.05);
              filter: brightness(1.1) contrast(1.05);
            }
            75% {
              transform: scale(1.06) translateY(1px);
              filter: brightness(1.12) contrast(1.06);
            }
          }
          @keyframes vicIdle {
            0%, 100% {
              transform: scale(1);
              filter: brightness(1);
            }
            50% {
              transform: scale(1.02);
              filter: brightness(1.05);
            }
          }
        `}</style>
      </div>

      {/* Connect/Disconnect Button - black, minimal */}
      <div className="relative mb-4">
        {/* Subtle shadow glow when not connected */}
        {!isConnected && !isConnecting && (
          <div
            className="absolute inset-0 rounded-full animate-[pulse_2s_ease-in-out_infinite] blur-md bg-black/20"
            style={{ transform: 'scale(1.1)' }}
          />
        )}
        <button
          onClick={isConnected ? handleDisconnect : handleConnect}
          disabled={isConnecting}
          className={`relative z-10 px-10 py-4 rounded-full font-medium text-lg transition-all duration-300 flex items-center gap-3 ${
            isConnected
              ? 'bg-gray-800 text-white hover:bg-gray-700 shadow-lg'
              : isConnecting
              ? 'bg-gray-200 text-gray-500 cursor-wait'
              : 'bg-black text-white hover:bg-gray-800 shadow-xl hover:shadow-2xl hover:scale-105'
          }`}
        >
          {isConnecting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Connecting...
            </>
          ) : isConnected ? (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              End Conversation
            </>
          ) : (
            <>
              <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
              </svg>
              Speak to VIC
            </>
          )}
        </button>
      </div>

      {/* Waveform Animation */}
      <div className="flex items-center justify-center gap-[2px] h-10 w-48 mb-4">
        {waveHeights.map((height, i) => (
          <div
            key={i}
            className={`w-[2px] rounded-full transition-all duration-100 ${
              isPlaying
                ? 'bg-black'
                : isConnected
                ? 'bg-gray-700'
                : 'bg-gray-400'
            }`}
            style={{
              height: `${isPlaying ? Math.min(height * 1.3, 100) : height}%`,
              transition: isPlaying ? 'all 0.05s ease-out' : 'all 0.1s ease-out'
            }}
          />
        ))}
      </div>

      {/* Status Text - clickable when not connected */}
      {isConnected || isConnecting ? (
        <p className={`text-base md:text-lg font-serif mb-4 text-center transition-all ${
          isPlaying ? 'text-black font-semibold' : 'text-gray-600'
        }`}>
          {isConnecting
            ? "Connecting to VIC..."
            : isPlaying
            ? "VIC is speaking..."
            : "Ask me about London..."}
        </p>
      ) : (
        <button
          onClick={handleConnect}
          className={`text-base md:text-lg font-serif mb-4 text-center transition-all cursor-pointer hover:text-black ${
            isError ? 'text-red-600' : 'text-gray-600'
          }`}
        >
          {isError
            ? "Connection lost — tap to reconnect"
            : "Tap to discover London's secrets"}
        </button>
      )}

      {/* Featured Article - appears when VIC finds one */}
      {isConnected && featuredArticle && (
        <div className="w-full max-w-md mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <p className="text-gray-500 text-xs font-medium text-center mb-3 uppercase tracking-wide">VIC Found This</p>
          <ArticleCard article={featuredArticle} />
        </div>
      )}

      {/* Topics VIC can discuss - minimal startup style */}
      <div className="text-center mb-6 w-full max-w-lg">
        <p className="text-gray-500 text-sm mb-3">
          {isConnected ? "Ask about:" : "Topics:"}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            'Thorney Island',
            'Shakespeare',
            'Medieval',
            'Tudor',
            'Hidden Rivers',
            'Roman',
            'Victorian',
          ].map((topic) => (
            <span
              key={topic}
              className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-black hover:text-white transition-all cursor-default"
            >
              {topic}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function VoiceWidget() {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function getAccessToken() {
      try {
        const response = await fetch('/api/hume-token')
        if (!response.ok) throw new Error('Failed to get access token')
        const data = await response.json()
        setAccessToken(data.accessToken)
      } catch (err) {
        setError('Voice service unavailable. Please try again later.')
        console.error('Error getting Hume token:', err)
      }
    }
    getAccessToken()
  }, [])

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 font-serif">{error}</p>
      </div>
    )
  }

  if (!accessToken) {
    return (
      <div className="text-center py-20">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 font-serif">Loading VIC...</p>
      </div>
    )
  }

  return (
    <VoiceProvider
      onError={(err) => console.error('[VIC Error]', err)}
      onClose={(e) => console.warn('[VIC Close]', e?.code, e?.reason)}
    >
      <VoiceInterface accessToken={accessToken} />
    </VoiceProvider>
  )
}
