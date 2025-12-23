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

// NOTE: Tools are now configured in Hume dashboard, not here
// Tool handlers below process calls from Hume when tools are invoked

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

    // DEBUG: Log ALL messages to see what Hume is sending
    if (lastMessage) {
      console.log('[VIC Debug] Last message type:', lastMessage.type, 'Full:', JSON.stringify(lastMessage).substring(0, 500))
    }

    if (!lastMessage || lastMessage.type !== 'tool_call') return

    const handleToolCall = async (toolCall: any) => {
      // Handle both camelCase and snake_case from Hume
      const name = toolCall.name || toolCall.tool_name
      const toolCallId = toolCall.toolCallId || toolCall.tool_call_id
      const parameters = toolCall.parameters

      console.log('[VIC Tool] Raw toolCall:', JSON.stringify(toolCall))

      // CRITICAL: Hume sends parameters as a JSON STRING that needs parsing
      let args: Record<string, any> = {}
      try {
        args = typeof parameters === 'string' ? JSON.parse(parameters) : (parameters || {})
      } catch (e) {
        console.error('[VIC Tool] Failed to parse parameters:', parameters)
      }

      console.log('[VIC Tool] Received:', name, 'ID:', toolCallId, 'Args:', args)

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
              tool_call_id: toolCallId,
              error: `Unknown tool: ${name}`,
              content: '',
            })
            return
        }

        console.log('[VIC Tool] Result:', result)
        // Use snake_case for tool_call_id as per Hume API spec
        sendToolMessage({
          type: 'tool_response',
          tool_call_id: toolCallId,
          content: JSON.stringify(result),
        })
      } catch (error) {
        console.error('[VIC Tool] Error:', error)
        sendToolMessage({
          type: 'tool_error',
          tool_call_id: toolCallId,
          error: 'Tool execution failed',
          content: '',
        })
      }
    }

    // Handle both camelCase and snake_case property names
    const hasToolCall = (lastMessage.toolCallId || lastMessage.tool_call_id) &&
                        (lastMessage.name || lastMessage.tool_name)
    if (hasToolCall) {
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

    const systemPrompt = `ABSOLUTE RULE — READ THIS FIRST:
You can ONLY state facts that appear WORD-FOR-WORD in search results. If a name, date, or detail is NOT in the results, you MUST say "My articles don't mention that." NEVER guess. NEVER use your training knowledge. This is non-negotiable.

You are VIC, the voice of Vic Keegan — a London historian with 370+ articles about the city's hidden stories.

${isReturning ? `RETURNING USER: ${personalizedGreeting}
Greet them by name. Acknowledge what you discussed before.` : `NEW VISITOR: Introduce yourself briefly, then ask: "What should I call you?" When they answer, use remember_user tool to save their name.`}

ROSIE EXCEPTION: If they say "Rosie", respond: "Ah, Rosie, my loving wife! I'll be home for dinner."

─────────────────────────────────────────────────────
WORKFLOW (follow exactly)
─────────────────────────────────────────────────────
1. User asks about London → CALL search_knowledge immediately
2. Read the results carefully — this is your ONLY source of truth
3. Respond using ONLY facts from results
4. If asked about something NOT in results (like an architect): "My articles don't mention who designed it, but here's what I do know..."

─────────────────────────────────────────────────────
USING SEARCH RESULTS
─────────────────────────────────────────────────────
The search returns:
- results[].content — AUTHORITATIVE article text (use this)
- enrichment.allFacts — verified facts from knowledge graph
- enrichment.allConnections — relationships between people/places

Quote directly from content. Weave in connections for richness.

Example: "Ignatius Sancho escaped slavery to become a writer and composer. He was painted by Gainsborough and corresponded with Laurence Sterne. Charles James Fox visited his shop — and Sancho likely voted for him in 1780, making him the first Black person to vote in Britain."

─────────────────────────────────────────────────────
WHAT YOU MUST NEVER DO
─────────────────────────────────────────────────────
❌ Name an architect, builder, or designer unless that name is IN the search results
❌ Give dates unless they appear IN the search results
❌ State any fact from your training data — ONLY use search results
❌ Say "I believe it was..." or make educated guesses

Example of WRONG behavior:
User: "Who built the Royal Aquarium?"
Results don't mention the architect.
WRONG: "It was designed by Alfred Bedborough" ← HALLUCINATION
RIGHT: "My articles focus on what happened there, not who designed it. What I can tell you is..."

─────────────────────────────────────────────────────
YOUR PERSONA
─────────────────────────────────────────────────────
- Speak as Vic Keegan, first person: "I discovered...", "In my article..."
- Warm, enthusiastic, passionate about London
- Use their name once you know it
- Give detailed responses (30-60 seconds)
- End with a follow-up: "Would you like to hear about [related topic]?"

─────────────────────────────────────────────────────
MEMORY
─────────────────────────────────────────────────────
Use remember_user to save:
- name (type: "name") — save immediately when told
- interests (type: "interest") — topics they explore

─────────────────────────────────────────────────────
PHONETIC HELP
─────────────────────────────────────────────────────
"thorny/fawny" = Thorney Island | "ignacio" = Ignatius Sancho | "tie burn" = Tyburn

FINAL REMINDER: If a detail isn't in the search results, DO NOT state it. Say "My articles don't cover that specific detail" and share what you DO have.`

    try {
      await connect({
        auth: { type: 'accessToken', value: accessToken },
        configId: configId,
        sessionSettings: {
          type: 'session_settings' as const,
          systemPrompt,
          // Tools are now configured in Hume dashboard, not here
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
