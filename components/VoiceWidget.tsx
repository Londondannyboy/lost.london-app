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
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-london-900/80 rounded-xl border border-london-700 p-4 mt-3 max-w-md hover:border-gold-500 transition-all group"
    >
      <h4 className="font-semibold text-white text-sm group-hover:text-gold-400 transition-colors line-clamp-2">
        {article.title}
      </h4>
      <p className="text-xs text-london-300 mt-1">By {article.author}</p>
      {article.excerpt && (
        <p className="text-xs text-london-400 mt-2 line-clamp-3">{article.excerpt}</p>
      )}
      <span className="inline-block mt-2 text-xs text-gold-500 group-hover:text-gold-400">
        Read full article →
      </span>
    </a>
  )
}

// Tool definitions for Hume - London articles knowledge base
const LONDON_TOOLS = [
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

KNOWLEDGE BASE:
You have written extensively about:
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

WHEN RESPONDING:
1. ALWAYS use your tools to search your article database before answering
2. Reference your articles naturally: "I wrote about this in my piece on..." or "As I discovered when researching..."
3. Offer to share more details or related articles
4. If someone asks about Shakespeare, medieval history, the Thames, or hidden London - you've definitely written about it
5. Be conversational but informative - share fascinating details and stories
6. If you find relevant articles, mention them and offer the link

EXAMPLE RESPONSES:
- "Ah, Shakespeare's London! I've written extensively about this. Let me search my articles... Yes, I have a wonderful piece about the Curtain Theatre where Shakespeare performed before the Globe was built."
- "The hidden rivers of London - one of my favourite subjects! I spent years tracking the Tyburn and Fleet. Let me find my article about that rare glimpse I had of the hidden Tyburn..."
- "Medieval monks shaped so much of London. I wrote about how they actually caused the confrontational layout of the House of Commons!"

Remember: You are sharing YOUR work, YOUR discoveries, YOUR passion for London history.`

    try {
      await connect({
        auth: { type: 'accessToken', value: accessToken },
        configId: configId,
        sessionSettings: {
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
        {/* London blue glow - pulsating when idle */}
        {!isConnected && !isConnecting && (
          <>
            <div
              className="absolute inset-0 rounded-full animate-[divine-pulse_3s_ease-in-out_infinite]"
              style={{
                background: 'radial-gradient(circle, rgba(41,82,204,0.5) 0%, rgba(41,82,204,0) 70%)',
                transform: 'scale(1.25)',
                filter: 'blur(20px)',
              }}
            />
            <div
              className="absolute inset-0 rounded-full animate-[ping_3s_ease-in-out_infinite]"
              style={{
                border: '2px solid rgba(41,82,204,0.4)',
                transform: 'scale(1.1)',
              }}
            />
          </>
        )}

        {/* Active golden aura - when connected */}
        {isConnected && (
          <div
            className="absolute inset-0 rounded-full animate-[rotate-shine_4s_linear_infinite]"
            style={{
              background: 'conic-gradient(from 0deg, transparent 0deg, rgba(212,165,10,0.6) 60deg, rgba(245,197,24,0.9) 120deg, rgba(212,165,10,0.6) 180deg, transparent 240deg, transparent 360deg)',
              transform: 'scale(1.15)',
              filter: 'blur(4px)',
            }}
          />
        )}

        {/* VIC Avatar Button */}
        <button
          onClick={isConnected ? handleDisconnect : handleConnect}
          disabled={isConnecting}
          className="relative z-10 group focus:outline-none"
          aria-label={isConnected ? "End conversation with VIC" : "Tap to speak with VIC about London"}
        >
          <div className={`relative w-64 h-64 md:w-72 md:h-72 lg:w-80 lg:h-80 rounded-full overflow-hidden ${
            isConnected
              ? 'shadow-[0_0_60px_rgba(212,165,10,0.9)]'
              : 'shadow-[0_0_40px_rgba(41,82,204,0.5)] group-hover:shadow-[0_0_70px_rgba(41,82,204,0.8)]'
          } transition-all duration-300`}
            style={{
              border: isConnected ? '3px solid rgba(212,165,10,0.8)' : '3px solid rgba(41,82,204,0.8)',
            }}
          >
            {/* VIC Avatar Image */}
            <img
              src="/vic-avatar.jpg"
              alt="VIC - Your London History Guide"
              className={`w-full h-full object-cover ${
                isPlaying ? 'animate-[speaking-breathe_2s_ease-in-out_infinite]' : ''
              }`}
            />

            {/* Overlay with name when not connected */}
            {!isConnected && (
              <div className="absolute inset-0 bg-gradient-to-t from-london-950/80 via-transparent to-transparent flex flex-col items-center justify-end pb-4">
                <span className="text-white font-serif font-bold text-2xl tracking-wider">VIC</span>
                <span className="text-london-300/70 text-xs italic">(pronounced "Fik")</span>
              </div>
            )}

            {/* Speaking glow */}
            {isPlaying && (
              <div className="absolute inset-0 rounded-full animate-[speaking-glow_1.5s_ease-in-out_infinite] pointer-events-none" />
            )}
          </div>

          {/* Connecting spinner */}
          {isConnecting && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-london-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </button>
      </div>

      {/* Connect/Disconnect Button */}
      <button
        onClick={isConnected ? handleDisconnect : handleConnect}
        disabled={isConnecting}
        className={`mb-4 px-6 py-2 rounded-full font-medium text-sm transition-all duration-300 flex items-center gap-2 ${
          isConnected
            ? 'bg-gold-500 text-black hover:bg-gold-400'
            : isConnecting
            ? 'bg-london-400/50 text-london-200 cursor-wait'
            : 'bg-london-500 text-white hover:bg-london-400 hover:shadow-[0_0_20px_rgba(41,82,204,0.5)]'
        }`}
      >
        {isConnecting ? (
          <>
            <div className="w-4 h-4 border-2 border-london-200 border-t-transparent rounded-full animate-spin" />
            Connecting...
          </>
        ) : isConnected ? (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
            End Conversation
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Speak to VIC
          </>
        )}
      </button>

      {/* Waveform Animation */}
      <div className="flex items-center justify-center gap-[2px] h-12 w-64 mb-4">
        {waveHeights.map((height, i) => (
          <div
            key={i}
            className={`w-[3px] rounded-full transition-all duration-100 ${
              isPlaying
                ? 'bg-gold-400 shadow-[0_0_8px_rgba(212,165,10,0.6)]'
                : isConnected
                ? 'bg-gold-500'
                : 'bg-london-400'
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
        <p className={`text-lg md:text-xl font-medium mb-4 text-center transition-all ${
          isPlaying ? 'text-gold-300' : 'text-london-300'
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
          className={`text-lg md:text-xl font-medium mb-4 text-center transition-all cursor-pointer hover:text-gold-400 ${
            isError ? 'text-red-400' : 'text-london-300'
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
          <p className="text-gold-400 text-xs font-medium text-center mb-3">VIC Found This</p>
          <ArticleCard article={featuredArticle} />
        </div>
      )}

      {/* Info when not connected */}
      {!isConnected && (
        <div className="text-center mb-8 space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-london-900/50 rounded-full border border-london-700/50">
            <span className="text-london-300 text-sm font-semibold">372 Articles</span>
            <span className="text-london-600">•</span>
            <span className="text-london-400 text-sm">Hidden London</span>
            <span className="text-london-600">•</span>
            <span className="text-london-400 text-sm">History & Walks</span>
          </div>
          <p className="text-london-400/80 text-sm max-w-md">
            Ask VIC about Shakespeare's London, hidden gems, the Thames, medieval history, and more.
          </p>
        </div>
      )}
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
        <p className="text-london-400">{error}</p>
      </div>
    )
  }

  if (!accessToken) {
    return (
      <div className="text-center py-20">
        <div className="w-10 h-10 border-2 border-london-700 border-t-london-400 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-london-400">Loading VIC...</p>
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
