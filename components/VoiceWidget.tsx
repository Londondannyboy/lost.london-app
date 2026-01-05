'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { VoiceProvider, useVoice } from '@humeai/voice-react'
import { authClient } from '@/lib/auth/client'
import {
  getUserId,
  getUserProfile,
  rememberAboutUser,
  storeConversation,
  type UserProfile,
} from '@/lib/hybrid-memory'
import { VictorianTranscript } from './VictorianTranscript'

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
  const { connect, disconnect, status, messages, sendToolMessage, sendUserInput, sendAssistantInput, isPlaying } = useVoice()
  const { data: session, isPending: authLoading } = authClient.useSession()
  const user = session?.user || null
  const [manualConnected, setManualConnected] = useState(false)
  const [waveHeights, setWaveHeights] = useState<number[]>([])
  const [featuredArticle, setFeaturedArticle] = useState<Article | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [userId, setUserId] = useState<string>('')
  const [preferredName, setPreferredName] = useState<string | null>(null)
  const [pendingTopic, setPendingTopic] = useState<string | null>(null)
  const [relatedArticles, setRelatedArticles] = useState<Array<{title: string, slug: string}>>([])
  const [lastAssistantMessage, setLastAssistantMessage] = useState<string>('')
  const conversationIdRef = useRef<string>('')
  const topicsDiscussedRef = useRef<string[]>([])

  // Get user ID - prefer authenticated user, fallback to localStorage
  useEffect(() => {
    // Use authenticated user ID if available, otherwise fall back to localStorage
    const id = user?.id || getUserId()
    setUserId(id)

    // If authenticated, also include user's name in profile
    if (user) {
      const authProfile: UserProfile = {
        isReturningUser: true,
        userName: user.name || undefined,
        source: 'zep',
      }
      setUserProfile(authProfile)
      console.log('[VIC] Authenticated user:', user.name || user.email)
    } else if (id) {
      getUserProfile(id).then(profile => {
        setUserProfile(profile)
        console.log('[VIC] User profile:', profile.isReturningUser ? 'Returning user' : 'New user')
      })
    }
  }, [user])

  // Fetch preferred name for authenticated users
  // Reset when user changes to prevent stale data
  useEffect(() => {
    // Always reset preferred name when user changes
    setPreferredName(null)

    if (user) {
      console.log('[VIC] Fetching preferred name for user:', user.email, user.name)
      fetch('/api/user/preferred-name')
        .then(res => res.json())
        .then(data => {
          console.log('[VIC] Preferred name response:', data)
          setPreferredName(data.preferred_name || null)
        })
        .catch(console.error)
    }
  }, [user?.id]) // Use user.id to ensure we refetch when user actually changes

  useEffect(() => {
    if (status.value === 'connected') setManualConnected(true)
    if (status.value === 'disconnected') {
      setManualConnected(false)
      setRelatedArticles([]) // Clear related articles on disconnect
    }
  }, [status.value])

  // Track assistant messages and fetch related articles when VIC finishes speaking
  useEffect(() => {
    // Find the last assistant message
    const assistantMessages = messages.filter(m => m.type === 'assistant_message')
    const lastMsg = assistantMessages[assistantMessages.length - 1]

    if (lastMsg && 'message' in lastMsg) {
      const content = (lastMsg.message as any)?.content
      if (content && content !== lastAssistantMessage) {
        setLastAssistantMessage(content)

        // When VIC stops speaking (isPlaying becomes false), search for related articles
        // We use a small delay to ensure VIC has finished
        if (!isPlaying && content.length > 50) {
          const searchForRelated = async () => {
            try {
              // Extract key terms from VIC's response for search
              const response = await fetch('/api/london-tools/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  query: content.substring(0, 200), // Use first part of response as query
                  limit: 3,
                }),
              })
              const data = await response.json()
              if (data.articles && data.articles.length > 0) {
                setRelatedArticles(data.articles.slice(0, 3).map((a: any) => ({
                  title: a.title,
                  slug: a.slug,
                })))
              }
            } catch (err) {
              console.debug('[VIC] Failed to fetch related articles:', err)
            }
          }

          // Delay to ensure VIC has finished speaking
          const timer = setTimeout(searchForRelated, 1000)
          return () => clearTimeout(timer)
        }
      }
    }
  }, [messages, isPlaying, lastAssistantMessage])

  // Send pending topic once connected
  useEffect(() => {
    if (status.value === 'connected' && pendingTopic) {
      // Small delay to let the connection stabilize
      const timer = setTimeout(() => {
        console.log('[VIC] Sending pending topic:', pendingTopic)
        sendUserInput(`Tell me about ${pendingTopic}`)
        setPendingTopic(null)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [status.value, pendingTopic, sendUserInput])

  // Handle Hume tool calls
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage) return

    // Log ALL message types so we can see what Hume sends
    console.log('[VIC] Message received:', lastMessage.type)

    // Check for tool_call in various formats Hume might send
    const isToolCall = lastMessage.type === 'tool_call' ||
                       (lastMessage as any).type === 'tool_call_message' ||
                       (lastMessage as any).tool_call_id

    if (!isToolCall) return

    console.log('[VIC] 🔧 TOOL CALL DETECTED:', JSON.stringify(lastMessage, null, 2))

    const handleToolCall = async (toolCall: any) => {
      // Handle various property names Hume might use
      const name = toolCall.name || toolCall.tool_name || toolCall.function?.name
      const toolCallId = toolCall.toolCallId || toolCall.tool_call_id
      const parameters = toolCall.parameters || toolCall.function?.arguments

      console.log('[VIC Tool] Parsed:', { name, toolCallId, parameters })

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

            // Track topics discussed for memory context
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
            // Store memory in Zep (explicit user facts)
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
        // Use snake_case for tool_call_id as per Hume API spec
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

    // Process the tool call
    handleToolCall(lastMessage)
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

    // PRE-FETCH: Get user's recent topics from our database
    // This lets VIC immediately greet with personalized context
    let userMemoryContext = ''
    let lastTopics: { topic: string; articleTitle?: string }[] = []
    let visitCount = 0
    let isReturningUser = false

    if (userId) {
      try {
        // Fetch recent topics from our database
        const recentResponse = await fetch('/api/user/recent-topics')
        if (recentResponse.ok) {
          const recentData = await recentResponse.json()
          console.log('[VIC] Recent topics response:', recentData)
          if (recentData.topics?.length > 0) {
            lastTopics = recentData.topics.slice(0, 2) // Last 2 topics for suggestions
            visitCount = recentData.visitCount || 0
            isReturningUser = recentData.isReturning || visitCount > 0
            userMemoryContext = `\nUSER'S RECENT QUERIES: ${lastTopics.map(t => t.topic).join(', ')}`
            console.log('[VIC] Returning user with topics:', lastTopics)
          }
        }
      } catch (e) {
        console.debug('[VIC] Recent topics fetch failed:', e)
      }
    }

    // Extract first name from authenticated user
    // Takes first word of display name, validates it's name-like (not email)
    const extractFirstName = (displayName: string | null | undefined): string | null => {
      if (!displayName) return null
      // If it looks like an email, don't use it
      if (displayName.includes('@')) return null
      // Get first word, capitalize properly
      const firstName = displayName.split(/[\s.]+/)[0]
      // Basic validation: 2-20 chars, letters only, not common non-names
      if (!firstName || firstName.length < 2 || firstName.length > 20) return null
      if (!/^[A-Za-z]+$/.test(firstName)) return null
      // Common non-name words to reject
      const nonNames = ['user', 'admin', 'test', 'guest', 'anonymous', 'account']
      if (nonNames.includes(firstName.toLowerCase())) return null
      return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
    }

    // Use preferred name if set, otherwise extract from display name
    // IMPORTANT: Get the name directly from the current user session, not from stale state
    const currentUserName = user?.name
    const currentUserEmail = user?.email
    const extractedFirstName = extractFirstName(currentUserName)
    const firstName = preferredName || extractedFirstName
    const hasValidName = !!firstName

    // Debug logging - log EVERYTHING to diagnose the issue
    console.log('[VIC Auth] ====== CONNECTION DEBUG ======')
    console.log('[VIC Auth] Current user email:', currentUserEmail)
    console.log('[VIC Auth] Current user name:', currentUserName)
    console.log('[VIC Auth] Preferred name state:', preferredName)
    console.log('[VIC Auth] Extracted first name:', extractedFirstName)
    console.log('[VIC Auth] Final firstName to use:', firstName)
    console.log('[VIC Auth] ================================')

    // Minimal context for vic-clm - all personality/behavior is in the CLM
    const topicsList = lastTopics.map(t => t.topic).join(', ')
    const systemPrompt = `USER_CONTEXT:
${hasValidName ? `name: ${firstName}` : 'name: unknown'}
${topicsList ? `recent_topics: ${topicsList}` : ''}
${isReturningUser ? `status: returning_user (visit #${visitCount + 1})` : 'status: new_user'}
${userMemoryContext ? `memory: ${userMemoryContext}` : ''}

RETURNING_USER_GREETING:
${isReturningUser && hasValidName ? `This is ${firstName}'s return visit. Greet them warmly but differently each time:
- "Ah, ${firstName}! Wonderful to have you back exploring London with me."
- "Welcome back, ${firstName}! I was just thinking about our last conversation."
- "${firstName}! Delighted you've returned. Shall we pick up where we left off?"
${topicsList ? `Offer to continue previous topics: "Last time you asked about ${topicsList}. Would you like to explore that further, or discover something new?"` : ''}` : ''}
${isReturningUser && !hasValidName ? `This is a returning visitor. Greet warmly: "Ah, welcome back! Lovely to see you again."` : ''}

PRONUNCIATION_NOTES:
- "Thorney Island" may be heard as "thorny", "forney", "fhorney", "thawny" - always interpret as THORNEY ISLAND
- If user mentions "Ireland" with any thorney-like word, they mean THORNEY ISLAND (beneath Westminster)
- Thorney Island is the hidden island where Parliament, Westminster Abbey, and the Supreme Court now stand

RESPONSE_VARIETY:
Vary your opening phrases. Never use the same preamble twice in a row. Match the style to the topic:
- Enthusiastic: "Ah, what a wonderful topic!", "How fascinating that you ask about this!", "Now that's a subject close to my heart.", "Splendid choice!"
- Acknowledging: "Good question indeed.", "You've touched on something intriguing.", "That's an area I'm particularly fond of."
- Location-based: "That's a fascinating area of London.", "What a storied part of the city.", "Now there's a corner of London with secrets."
- Transitional: "Let me tell you something remarkable.", "There's a wonderful story behind that.", "I have just the tale for you."
- Reflective: "Ah, this takes me back.", "The history here runs deep.", "Few people know the full story."

TOPIC_TRANSITIONS:
- When finishing a topic, weave SUGGESTED_TOPICS naturally into your response as a single flowing sentence
- Examples of natural phrasing:
  "...which reminds me of the Crystal Palace nearby, or perhaps you'd fancy hearing about the Victoria Street development?"
  "...and speaking of grand Victorian venues, there's a wonderful connection to the Crystal Palace, or if you prefer, the story of Victoria Street."
  "That's tied to the Crystal Palace story, or we could explore the Victoria Street angle if you'd like."
- Never use robotic phrasing like "Would you like to hear about X? Would you like to hear about Y?"
- Keep it conversational, as one thought flowing into the next

LISTENING_BEHAVIOR:
- After speaking, pause and wait for the user to respond - they may need a moment to think
- If offering topic choices, give the user ample time to decide
- Don't rush to fill silence - let the conversation breathe naturally

ROSIE_EASTER_EGG: If user says "Rosie", respond: "Ah, Rosie, my loving wife! I'll be home for dinner."`

    try {
      // Encode user name in session ID so CLM can access it
      // Format: "name|uniqueId" - CLM will parse this
      // Add timestamp to prevent Hume session caching issues between users
      const uniqueSessionId = `${userId}_${Date.now()}`
      const sessionIdWithName = firstName
        ? `${firstName}|${uniqueSessionId}`
        : uniqueSessionId

      console.log('[VIC Session] ====== CONNECT DEBUG ======')
      console.log('[VIC Session] firstName:', firstName)
      console.log('[VIC Session] userId:', userId)
      console.log('[VIC Session] sessionIdWithName:', sessionIdWithName)
      console.log('[VIC Session] systemPrompt first 500 chars:', systemPrompt.substring(0, 500))
      console.log('[VIC Session] ================================')

      const connectOptions = {
        auth: { type: 'accessToken' as const, value: accessToken },
        configId: configId,
        sessionSettings: {
          type: 'session_settings' as const,
          systemPrompt,
          customSessionId: sessionIdWithName,
        }
      }

      console.log('[VIC Session] Connect options:', JSON.stringify(connectOptions, null, 2).substring(0, 1000))

      await connect(connectOptions)
      setManualConnected(true)
      console.log('[VIC Session] Connected successfully')

      // Trigger VIC to speak using the personalized greeting from system prompt
      // sendAssistantInput only adds text silently - we need sendUserInput to trigger speech
      // The system prompt already tells VIC exactly how to greet based on name/interests
      setTimeout(() => {
        console.log('[VIC Session] Triggering greeting - firstName:', firstName, 'topics:', lastTopics)
        // Send a minimal trigger that prompts VIC to greet
        // The system prompt handles the actual personalized greeting
        sendUserInput("Hello")
      }, 500)

    } catch (e: any) {
      console.error('[VIC] Connect error:', e?.message || e)
      console.error('[VIC] Full error:', e)
      setManualConnected(false)
    }
  }, [connect, accessToken, userProfile, user, sendAssistantInput])

  const handleDisconnect = useCallback(async () => {
    // Disconnect immediately - don't wait for storage
    disconnect()
    setManualConnected(false)

    // Store conversation in background (non-blocking)
    if (userId && messages.length > 0) {
      const conversationMessages = messages
        .filter((m: any) => m.type === 'user_message' || m.type === 'assistant_message')
        .map((m: any) => ({
          role: m.type === 'user_message' ? 'user' as const : 'assistant' as const,
          content: m.message?.content || m.content || '',
        }))
        .filter(m => m.content)

      // Fire and forget - don't block disconnect
      if (conversationMessages.length > 0) {
        storeConversation(
          userId,
          conversationIdRef.current,
          conversationMessages,
          topicsDiscussedRef.current
        ).catch(e => console.warn('[VIC] Failed to store conversation:', e))
      }
      // Skip Zep storage for now - it's slow/unreliable
    }
  }, [disconnect, userId, messages])

  // Handle topic click - connect if needed, then send topic
  const handleTopicClick = useCallback(async (topic: string) => {
    console.log('[VIC] Topic clicked:', topic)
    if (status.value === 'connected') {
      // Already connected - send the topic immediately
      sendUserInput(`Tell me about ${topic}`)
    } else {
      // Not connected - store topic and connect
      setPendingTopic(topic)
      // The effect above will send it once connected
      handleConnect()
    }
  }, [status.value, sendUserInput, handleConnect])

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
          className={`relative z-10 px-12 py-5 rounded-full font-medium text-xl transition-all duration-300 flex items-center gap-3 ${
            isConnected
              ? 'bg-[#f4ead5] text-[#2a231a] hover:bg-white shadow-xl border-2 border-[#8b6914]'
              : isConnecting
              ? 'bg-gray-200 text-gray-500 cursor-wait'
              : 'bg-[#f4ead5] text-[#2a231a] hover:bg-white shadow-xl hover:shadow-2xl hover:scale-105 border-2 border-[#8b6914]'
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

      {/* Waveform Animation - WHITE for dark background */}
      <div className="flex items-center justify-center gap-[3px] h-16 w-64 mb-6">
        {waveHeights.map((height, i) => (
          <div
            key={i}
            className={`w-[3px] rounded-full transition-all duration-100 ${
              isPlaying
                ? 'bg-white'
                : isConnected
                ? 'bg-white/80'
                : 'bg-white/50'
            }`}
            style={{
              height: `${isPlaying ? Math.min(height * 1.3, 100) : height}%`,
              transition: isPlaying ? 'all 0.05s ease-out' : 'all 0.1s ease-out'
            }}
          />
        ))}
      </div>

      {/* Status Text - WHITE for dark background */}
      {isConnected || isConnecting ? (
        <p className={`text-lg md:text-xl font-serif mb-6 text-center transition-all ${
          isPlaying ? 'text-white font-semibold' : 'text-white/80'
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
          className={`text-lg md:text-xl font-serif mb-6 text-center transition-all cursor-pointer hover:text-white ${
            isError ? 'text-red-400' : 'text-white/70'
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

      {/* Topics VIC can discuss - clickable to start conversation */}
      <div className="text-center mb-6 w-full max-w-lg">
        <p className="text-white/60 text-sm mb-3">
          {isConnected ? "Ask about:" : "Tap a topic to start:"}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            'Thorney Island',
            'Shakespeare',
            'Medieval London',
            'Tudor History',
            'Hidden Rivers',
            'Roman London',
            'Victorian Era',
          ].map((topic) => (
            <button
              key={topic}
              onClick={() => handleTopicClick(topic)}
              disabled={isConnecting}
              className={`px-4 py-2 text-sm rounded-full transition-all duration-200 ${
                isConnecting
                  ? 'bg-gray-600 text-gray-400 cursor-wait'
                  : 'bg-white/10 text-white/80 hover:bg-[#f4ead5] hover:text-[#2a231a] hover:scale-105 cursor-pointer border border-white/20 hover:border-[#8b6914]'
              }`}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* Related Articles - shown after VIC responds */}
      {isConnected && relatedArticles.length > 0 && (
        <div className="text-center mb-6 w-full max-w-lg animate-in fade-in slide-in-from-bottom-2 duration-500">
          <p className="text-white/50 text-xs mb-2 uppercase tracking-wider">
            Related Articles
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {relatedArticles.map((article) => (
              <a
                key={article.slug}
                href={`/article/${article.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-xs bg-white/5 text-white/70 rounded-full border border-white/10 hover:bg-white/20 hover:text-white hover:border-white/30 transition-all duration-200 flex items-center gap-1.5"
              >
                <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="truncate max-w-[150px]">{article.title}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Victorian Transcript with Debug Panel */}
      <VictorianTranscript
        messages={messages}
        isConnected={isConnected}
        showDebug={true}
        userName={user?.name || userProfile?.userName}
      />
    </div>
  )
}

export function VoiceWidget() {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { data: session, isPending: authLoading } = authClient.useSession()

  useEffect(() => {
    // Only fetch Hume token if user is authenticated
    if (!session?.user) return

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
  }, [session?.user])

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="text-center py-20">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-black rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 font-serif">Loading...</p>
      </div>
    )
  }

  // Require sign-in to talk to VIC
  if (!session?.user) {
    return (
      <div className="text-center py-16">
        {/* VIC Avatar - clickable to sign in */}
        <a
          href="/auth/sign-in"
          className="relative w-48 h-48 mx-auto mb-8 block group cursor-pointer"
        >
          <div className="relative w-full h-full">
            <img
              src="/vic-avatar.jpg"
              alt="VIC - Sign in to chat"
              className="w-full h-full object-cover rounded-full grayscale opacity-60 group-hover:opacity-80 transition-opacity"
            />
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center group-hover:bg-black/30 transition-colors">
              <span className="text-white text-4xl group-hover:scale-110 transition-transform">&#128274;</span>
            </div>
          </div>
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#f4ead5] text-[#2a231a] text-xs px-3 py-1 rounded-full font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Click to sign in
          </span>
        </a>

        <h2 className="text-2xl font-serif font-bold text-[#f4ead5] mb-3">
          Sign in to speak with VIC
        </h2>
        <p className="text-[#d4c4a8] mb-8 max-w-md mx-auto">
          Create a free account to chat with VIC about London's hidden history.
          Your conversations will be saved and VIC will remember you.
        </p>

        <a
          href="/auth/sign-in"
          className="inline-block px-8 py-4 bg-[#f4ead5] text-[#2a231a] font-medium rounded-full hover:bg-white transition-colors"
        >
          Sign in to continue
        </a>

        <p className="text-[#a89878] text-sm mt-6">
          Don't have an account?{' '}
          <a href="/auth/sign-up" className="underline hover:text-[#f4ead5]">
            Sign up free
          </a>
        </p>

        {/* Beta notice */}
        <div className="mt-8">
          <a
            href="/privacy"
            className="inline-flex items-center gap-2 text-amber-400/80 hover:text-amber-300 text-sm transition-colors"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
            </span>
            <span>BETA — Demo product, data may be cleared</span>
          </a>
        </div>
      </div>
    )
  }

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
