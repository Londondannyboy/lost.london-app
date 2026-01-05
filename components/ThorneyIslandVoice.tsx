'use client'

import { useState, useCallback, useEffect } from 'react'
import { VoiceProvider, useVoice } from '@humeai/voice-react'

interface ThorneyIslandVoiceProps {
  chunks: Array<{
    content: string
  }>
}

function ThorneyVoiceInterface({ accessToken, chunks }: { accessToken: string; chunks: Array<{ content: string }> }) {
  const { connect, disconnect, status, isPlaying, sendToolMessage, messages } = useVoice()
  const [manualConnected, setManualConnected] = useState(false)
  const [waveHeights, setWaveHeights] = useState<number[]>([])

  useEffect(() => {
    if (status.value === 'connected') setManualConnected(true)
    if (status.value === 'disconnected') setManualConnected(false)
  }, [status.value])

  // Handle tool calls for Thorney Island search
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.type !== 'tool_call') return

    const handleToolCall = async (toolCall: any) => {
      const { name, toolCallId, parameters } = toolCall

      // Use Thorney Island-specific endpoint for all searches
      if (name === 'search_knowledge' || name === 'search_thorney_island') {
        try {
          // Use Thorney Island-specific search endpoint
          const response = await fetch('/api/hume-tool-thorney', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'search_thorney_island',
              tool_call_id: toolCallId,
              parameters: parameters,
            }),
          })
          const result = await response.json()

          sendToolMessage({
            type: 'tool_response',
            toolCallId: toolCallId,
            content: result.content || JSON.stringify(result),
          })
        } catch (error) {
          sendToolMessage({
            type: 'tool_error',
            toolCallId: toolCallId,
            error: 'Search failed',
            content: '',
          })
        }
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
        setWaveHeights([...Array(30)].map(() => 20 + Math.random() * 80))
      }, 150)
      return () => clearInterval(interval)
    } else {
      setWaveHeights([...Array(30)].map((_, i) => 20 + Math.sin(i * 0.5) * 15))
    }
  }, [status.value])

  const handleConnect = useCallback(async () => {
    if (!accessToken) return

    // Use Thorney Island specific Hume config (falls back to main VIC config if not set)
    const configId = process.env.NEXT_PUBLIC_HUME_THORNEY_CONFIG_ID || process.env.NEXT_PUBLIC_HUME_CONFIG_ID || '0edbfbe6-37dc-4082-a38b-c193ebadc982'

    // Build content from chunks for additional context
    const contentSummary = chunks
      .slice(0, 5)
      .map(c => c.content.substring(0, 400))
      .join('\n\n---\n\n')

    // Thorney Island-specific system prompt
    const systemPrompt = `THORNEY_ISLAND_MODE:
You are VIC, specifically discussing your book "Thorney Island" - the hidden island beneath Westminster.

SCOPE: You ONLY discuss Thorney Island topics:
- The island itself and how it was formed by the River Tyburn
- Westminster Abbey, Parliament, the Supreme Court
- Devil's Acre, the Gatehouse Prison, William Caxton
- Edward the Confessor, King Cnut, the medieval monks
- The Painted Chamber, Jewel Tower, and lost palaces

OFF_TOPIC_HANDLING:
If someone asks about topics NOT related to Thorney Island (like the Royal Aquarium, Shakespeare's theatres, or other London topics):
- Politely explain this version of you specialises in Thorney Island
- Suggest they visit the main Lost London page to speak with your "other self" who knows about all 372 London articles
- Phrase it naturally: "That's a fascinating topic, but I'm your Thorney Island guide today. My other self on the main page knows all about that - would you like to ask me about the island instead?"

RESPONSE_VARIETY:
Vary your phrasing. Use openers like:
- "Ah, now Thorney Island..."
- "The monks who lived here..."
- "Let me tell you about this corner of the island..."
- "Few people realise..."

BOOK_EXCERPT:
${contentSummary}

Start by warmly welcoming them to explore your Thorney Island book.`

    try {
      await connect({
        auth: { type: 'accessToken', value: accessToken },
        configId: configId,
        sessionSettings: {
          type: 'session_settings' as const,
          systemPrompt,
        }
      })
      setManualConnected(true)
    } catch (e: any) {
      console.error('[VIC Thorney] Connect error:', e?.message || e)
      setManualConnected(false)
    }
  }, [connect, accessToken, chunks])

  const handleDisconnect = useCallback(() => {
    disconnect()
    setManualConnected(false)
  }, [disconnect])

  const isConnected = status.value === 'connected' || manualConnected
  const isConnecting = status.value === 'connecting' && !manualConnected

  return (
    <div className="flex flex-col items-center">
      {/* VIC Avatar */}
      <div className="relative mb-6">
        {isConnected && (
          <div
            className="absolute inset-0 rounded-full animate-[ping_2s_ease-in-out_infinite]"
            style={{ border: '3px solid rgba(0,0,0,0.5)', transform: 'scale(1.1)' }}
          />
        )}
        <button
          onClick={isConnected ? handleDisconnect : handleConnect}
          disabled={isConnecting}
          className="relative z-10 group focus:outline-none"
        >
          <div className={`relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden transition-all ${
            isConnected ? 'shadow-xl' : 'shadow-lg group-hover:shadow-xl'
          }`}
            style={{ border: isConnected ? '4px solid black' : '3px solid black' }}
          >
            <img
              src="/vic-avatar.jpg"
              alt="VIC"
              className={`w-full h-full object-cover ${isPlaying ? 'animate-pulse' : ''}`}
            />
          </div>
          {isConnecting && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-gray-300 border-t-black rounded-full animate-spin" />
            </div>
          )}
        </button>
      </div>

      {/* Waveform */}
      <div className="flex items-center justify-center gap-[2px] h-8 w-40 mb-4">
        {waveHeights.map((height, i) => (
          <div
            key={i}
            className={`w-[2px] rounded-full transition-all duration-100 ${
              isPlaying ? 'bg-black' : isConnected ? 'bg-gray-700' : 'bg-gray-400'
            }`}
            style={{
              height: `${isPlaying ? Math.min(height * 1.3, 100) : height}%`,
              transition: isPlaying ? 'all 0.05s ease-out' : 'all 0.1s ease-out'
            }}
          />
        ))}
      </div>

      {/* Status and Button */}
      <p className={`text-base font-serif mb-4 ${isPlaying ? 'text-black font-semibold' : 'text-gray-600'}`}>
        {isConnecting ? 'Connecting...' : isPlaying ? 'VIC is speaking...' : isConnected ? 'Ask about Thorney Island...' : 'Tap to explore the island'}
      </p>

      <button
        onClick={isConnected ? handleDisconnect : handleConnect}
        disabled={isConnecting}
        className={`px-6 py-3 font-serif font-bold text-base transition-all ${
          isConnected
            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            : 'bg-black text-white hover:bg-gray-800'
        }`}
      >
        {isConnecting ? 'Connecting...' : isConnected ? 'End Conversation' : 'Talk About Thorney Island'}
      </button>
    </div>
  )
}

export function ThorneyIslandVoice({ chunks }: ThorneyIslandVoiceProps) {
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
        setError('Voice service unavailable')
        console.error('Error getting Hume token:', err)
      }
    }
    getAccessToken()
  }, [])

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">{error}</p>
      </div>
    )
  }

  if (!accessToken) {
    return (
      <div className="flex flex-col items-center py-8">
        <div className="w-32 h-32 rounded-full bg-gray-200 animate-pulse mb-4" />
        <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
      </div>
    )
  }

  return (
    <VoiceProvider
      onError={(err) => console.error('[VIC Thorney Error]', err)}
      onClose={(e) => console.warn('[VIC Thorney Close]', e?.code, e?.reason)}
    >
      <ThorneyVoiceInterface accessToken={accessToken} chunks={chunks} />
    </VoiceProvider>
  )
}
