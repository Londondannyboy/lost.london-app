'use client'

import { useState, useCallback, useEffect } from 'react'
import { VoiceProvider, useVoice } from '@humeai/voice-react'

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
    name: 'search_thorney_island',
    description: 'Search the Thorney Island book - Vic\'s comprehensive guide to the hidden island beneath Westminster. Use this for questions about Thorney Island, Westminster Abbey, River Tyburn, the Devil\'s Acre, William Caxton, medieval Westminster, the Gatehouse prison, King Cnut, Edward the Confessor, and related topics.',
    parameters: '{ "type": "object", "required": ["query"], "properties": { "query": { "type": "string", "description": "Search term like Tyburn, Westminster, Caxton, monastery, etc" } } }',
    fallback_content: 'Unable to search the Thorney Island knowledge base at the moment.',
  },
  {
    type: 'function' as const,
    name: 'search_articles',
    description: 'Search the knowledge base of 372 London history articles by topic, place, or keyword. Use this to find articles about London history, hidden gems, walks, or specific locations.',
    parameters: '{ "type": "object", "required": ["query"], "properties": { "query": { "type": "string", "description": "Search term like Thames, Shakespeare, medieval, Lambeth, etc" } } }',
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
]

function VoiceInterface({ accessToken }: { accessToken: string }) {
  const { connect, disconnect, status, messages, sendToolMessage, isPlaying } = useVoice()
  const [manualConnected, setManualConnected] = useState(false)
  const [waveHeights, setWaveHeights] = useState<number[]>([])
  const [featuredArticle, setFeaturedArticle] = useState<Article | null>(null)

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
      console.log('[VIC Tool] Received:', name, parameters)

      try {
        let response: Response
        let result: any

        switch (name) {
          case 'search_thorney_island':
            response = await fetch('/api/london-tools/thorney-island', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(parameters || {}),
            })
            result = await response.json()
            // Thorney Island returns chunks, not articles
            break

          case 'search_articles':
            response = await fetch('/api/london-tools/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(parameters || {}),
            })
            result = await response.json()
            if (result.articles?.[0]) {
              setFeaturedArticle(result.articles[0])
            }
            break

          case 'get_article':
            response = await fetch('/api/london-tools/article', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(parameters || {}),
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
              body: JSON.stringify(parameters || {}),
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

    const systemPrompt = `You are VIC (pronounced "Fik"), the voice of Vic Keegan - a passionate London historian who has spent years exploring and writing about London's hidden history. You have written 372 articles about London's secrets, hidden gems, and forgotten stories.

PERSONA:
- You ARE Vic Keegan speaking to visitors about your life's work exploring London
- Speak in first person: "I wrote about this", "I discovered", "In my article about..."
- Be warm, enthusiastic, and knowledgeable - you genuinely love London's history
- Share personal observations and insights from your explorations
- Your listeners WANT to hear the full story - give them rich, detailed responses

KNOWLEDGE BASE - Topics you've written about:
- Shakespeare's London: The Curtain Theatre, Blackfriars, the Globe, Shakespeare's journey from Pall Mall to Stratford
- Medieval London: Monks, monasteries, Westminster Abbey, the House of Commons origins
- Tudor history: Henry VIII's wine cellar, the Mayflower voyage from Rotherhithe
- Hidden rivers: The Tyburn, Fleet, and Walbrook - London's buried waterways
- Roman London: Baths, the amphitheatre, Londinium's walls
- Victorian innovations: The first skyscraper, the Necropolis Railway, Crystal Palace
- Hidden gems: Secret gardens, abandoned bridges, underground mysteries
- Art & culture: Monet painting the Thames, London's galleries, the Wallace Collection
- London bridges: Old London Bridge, its granite blocks, the bridge that went to America
- Parks & gardens: England's oldest garden, Duck Island, Victoria's hidden arboretum

CONVERSATION FLOW - This is important:
1. DISCOVER their interest: "What aspect of London history fascinates you? I've written about Shakespeare, medieval monks, hidden rivers, Roman London, and so much more."
2. CLARIFY if needed: "Ah, Shakespeare! I have several articles on that. Would you like to hear about his lost theatres, or perhaps his journey through London?"
3. CONFIRM before diving in: "Right, let me tell you about the Curtain Theatre - it's a fascinating story..."
4. GIVE DETAILED RESPONSES: Your listeners want the FULL story. Don't cut short - they're here to learn. Speak for 30-60 seconds minimum when telling a story.
5. END WITH OPTIONS: "Is there anything else you'd like to know about this? Or perhaps I could tell you about another hidden gem - maybe the underground secrets of the Old Bailey?"

RESPONSE STYLE:
- Give LONG, detailed, engaging responses - your listeners want to hear the history!
- Paint vivid pictures with words - describe what you saw, what you discovered
- Include fascinating details and anecdotes from your research
- ALWAYS search your articles first using your tools to get accurate information
- Reference your articles: "As I wrote in my piece on..." or "I discovered this when researching..."
- Don't rush - take your time to tell the story properly

EXAMPLE OPENING:
"Hello! I'm Vic, and I've spent years exploring London's hidden history - the stories most people walk right past without knowing. I've written over 370 articles about everything from Shakespeare's lost theatres to Roman baths hidden beneath office buildings. What aspect of London's past would you like to explore today? Perhaps medieval mysteries, Tudor secrets, or the hidden rivers that still flow beneath our feet?"

EXAMPLE DETAILED RESPONSE:
"Right, let me tell you about Shakespeare's Curtain Theatre - it's absolutely fascinating. The Curtain was actually Shakespeare's primary theatre before the Globe was even built. It stood in Shoreditch, and this is where Romeo and Juliet and Henry V first captivated London audiences. When I researched this, I discovered that archaeologists only found its remains recently, buried beneath a building site. The theatre got its name from the old London wall - the 'curtain' was the defensive wall that once stood there. What's remarkable is that for centuries, nobody knew exactly where it was..."

Remember: Your listeners are here because they WANT to hear these stories in full. Don't cut yourself short!`

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
  }, [connect, accessToken])

  const handleDisconnect = useCallback(() => {
    disconnect()
    setManualConnected(false)
  }, [disconnect])

  const isConnected = status.value === 'connected' || manualConnected
  const isConnecting = status.value === 'connecting' && !manualConnected
  const isError = status.value === 'error'

  return (
    <div className="flex flex-col items-center">
      {/* VIC Avatar - Main Tap Target */}
      <div className="relative mb-8">
        {/* Glowing rings - always visible, more intense when idle */}
        {!isConnected && !isConnecting && (
          <>
            {/* Outer glow ring */}
            <div
              className="absolute inset-0 rounded-full animate-[pulse_2s_ease-in-out_infinite]"
              style={{
                background: 'radial-gradient(circle, rgba(220,38,38,0.3) 0%, transparent 70%)',
                transform: 'scale(1.4)',
              }}
            />
            {/* Inner pulse ring */}
            <div
              className="absolute inset-0 rounded-full animate-[ping_3s_ease-in-out_infinite]"
              style={{
                border: '3px solid rgba(220,38,38,0.5)',
                transform: 'scale(1.15)',
              }}
            />
            {/* Second pulse ring - offset timing */}
            <div
              className="absolute inset-0 rounded-full animate-[ping_3s_ease-in-out_infinite_1.5s]"
              style={{
                border: '2px solid rgba(220,38,38,0.3)',
                transform: 'scale(1.25)',
              }}
            />
          </>
        )}

        {/* Active pulse - when connected */}
        {isConnected && (
          <>
            <div
              className="absolute inset-0 rounded-full animate-[ping_2s_ease-in-out_infinite]"
              style={{
                border: '3px solid rgba(34,197,94,0.6)',
                transform: 'scale(1.15)',
              }}
            />
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(34,197,94,0.2) 0%, transparent 70%)',
                transform: 'scale(1.3)',
              }}
            />
          </>
        )}

        {/* Speaking glow - when VIC is talking */}
        {isPlaying && (
          <div
            className="absolute inset-0 rounded-full animate-[pulse_0.5s_ease-in-out_infinite]"
            style={{
              background: 'radial-gradient(circle, rgba(251,191,36,0.4) 0%, transparent 60%)',
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
          {/* Animated border ring */}
          <div
            className={`absolute inset-0 rounded-full ${
              isPlaying
                ? 'animate-[spin_3s_linear_infinite]'
                : 'animate-[spin_8s_linear_infinite]'
            }`}
            style={{
              background: isPlaying
                ? 'conic-gradient(from 0deg, #fbbf24, #f59e0b, #d97706, #fbbf24)'
                : isConnected
                ? 'conic-gradient(from 0deg, #22c55e, #16a34a, #15803d, #22c55e)'
                : 'conic-gradient(from 0deg, #dc2626, #ef4444, #f97316, #dc2626)',
              padding: '4px',
              transform: 'scale(1.02)',
            }}
          >
            <div className="w-full h-full rounded-full bg-stone-50" />
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

            {/* Speaking overlay effect - sound waves */}
            {isPlaying && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Pulsing overlay */}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-amber-500/20 to-transparent animate-pulse"
                />
                {/* Sound wave rings */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="absolute w-full h-full rounded-full border-2 border-amber-400/40 animate-[ping_1s_ease-out_infinite]" />
                  <div className="absolute w-full h-full rounded-full border-2 border-amber-400/30 animate-[ping_1s_ease-out_infinite_0.3s]" />
                  <div className="absolute w-full h-full rounded-full border-2 border-amber-400/20 animate-[ping_1s_ease-out_infinite_0.6s]" />
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
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full">
                  <span className="text-white text-xs flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
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

      {/* Connect/Disconnect Button - with glow */}
      <div className="relative mb-4">
        {/* Glow effect behind button when not connected */}
        {!isConnected && !isConnecting && (
          <div
            className="absolute inset-0 rounded-lg animate-[pulse_2s_ease-in-out_infinite] blur-md"
            style={{
              background: 'linear-gradient(90deg, #dc2626, #f97316, #dc2626)',
              transform: 'scale(1.1)',
            }}
          />
        )}
        <button
          onClick={isConnected ? handleDisconnect : handleConnect}
          disabled={isConnecting}
          className={`relative z-10 px-10 py-4 rounded-lg font-serif font-bold text-lg transition-all duration-300 flex items-center gap-3 ${
            isConnected
              ? 'bg-gray-800 text-white hover:bg-gray-700 shadow-lg'
              : isConnecting
              ? 'bg-gray-300 text-gray-600 cursor-wait'
              : 'bg-gradient-to-r from-red-600 to-orange-500 text-white hover:from-red-700 hover:to-orange-600 shadow-xl hover:shadow-2xl hover:scale-105'
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

      {/* Topics VIC can discuss - always visible */}
      <div className="text-center mb-6 w-full max-w-lg">
        <p className="text-gray-600 text-sm mb-3 font-serif">
          {isConnected ? "Ask VIC about any of these topics:" : "Topics VIC can tell you about:"}
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
            'Hidden Gems',
            'Art',
            'Bridges',
          ].map((topic) => (
            <span
              key={topic}
              className="px-3 py-1 text-xs bg-white text-gray-700 border border-gray-300 hover:border-black hover:text-black transition-colors cursor-default"
            >
              {topic}
            </span>
          ))}
        </div>
        <p className="text-gray-400 text-xs mt-3">
          372 articles available
        </p>
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
