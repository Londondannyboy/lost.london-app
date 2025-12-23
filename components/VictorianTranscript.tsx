'use client'

import { useEffect, useRef, useState } from 'react'

interface Message {
  type: string
  message?: { content?: string }
  content?: string
  receivedAt?: Date
}

interface ValidationLog {
  id: number
  created_at: string
  user_query: string
  articles_found: number
  article_titles: string[]
  facts_checked: string[]
  validation_passed: boolean
  validation_notes: string
  confidence_score: number
}

interface VictorianTranscriptProps {
  messages: Message[]
  isConnected: boolean
  showDebug?: boolean
}

export function VictorianTranscript({ messages, isConnected, showDebug = false }: VictorianTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [validationLogs, setValidationLogs] = useState<ValidationLog[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [debugExpanded, setDebugExpanded] = useState(true)

  // Filter to only user and assistant messages
  const conversationMessages = messages.filter(
    m => m.type === 'user_message' || m.type === 'assistant_message'
  )

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Fetch validation logs periodically when panel is open
  useEffect(() => {
    if (!showDebug || !isOpen) return

    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/vic-logs?limit=5')
        if (res.ok) {
          const data = await res.json()
          setValidationLogs(data.logs || [])
        }
      } catch (e) {
        console.error('Failed to fetch validation logs:', e)
      }
    }

    fetchLogs()
    const interval = setInterval(fetchLogs, 2000)
    return () => clearInterval(interval)
  }, [showDebug, isOpen, messages.length])

  const getMessageContent = (msg: Message): string => {
    return msg.message?.content || msg.content || ''
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const messageCount = conversationMessages.length

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-sm shadow-lg transition-all hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, #3d3225 0%, #2a231a 100%)',
          border: '2px solid #8b6914',
          color: '#f4ead5',
          fontFamily: 'Georgia, serif',
        }}
      >
        <span style={{ fontSize: '1.1rem' }}>📜</span>
        <span className="text-sm">
          {isOpen ? 'Close' : 'Transcript'}
        </span>
        {messageCount > 0 && !isOpen && (
          <span
            className="ml-1 px-2 py-0.5 text-xs rounded-full"
            style={{ background: '#8b6914', color: '#f4ead5' }}
          >
            {messageCount}
          </span>
        )}
      </button>

      {/* Slide-out Panel */}
      <div
        className={`fixed top-0 right-0 h-full z-40 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{
          width: '420px',
          maxWidth: '90vw',
          background: 'linear-gradient(135deg, #f4ead5 0%, #e8dcc4 100%)',
          boxShadow: isOpen ? '-4px 0 20px rgba(0, 0, 0, 0.3)' : 'none',
          borderLeft: '3px solid #8b6914',
        }}
      >
        {/* Panel Header */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{
            background: 'linear-gradient(180deg, #3d3225 0%, #2a231a 100%)',
            borderBottom: '2px solid #8b6914',
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: 'Georgia, serif',
                color: '#f4ead5',
                fontSize: '1.1rem',
                letterSpacing: '0.1em',
              }}
            >
              ⚜ Ye Olde Discourse ⚜
            </h2>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.7rem', color: '#a89878', marginTop: '2px' }}>
              A Record of Conversations
            </p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:opacity-70 transition-opacity"
            style={{ color: '#f4ead5', fontSize: '1.2rem' }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="h-full overflow-y-auto pb-32" style={{ scrollbarWidth: 'thin', scrollbarColor: '#8b6914 #e8dcc4' }}>

          {/* Transcript Section */}
          <div className="p-4">
            <div
              ref={scrollRef}
              className="max-h-[40vh] overflow-y-auto rounded-sm p-4"
              style={{
                background: 'linear-gradient(135deg, #fffbf0 0%, #f5edd8 100%)',
                border: '1px solid rgba(139, 105, 20, 0.3)',
              }}
            >
              {conversationMessages.length === 0 ? (
                <p
                  className="text-center py-6"
                  style={{
                    fontFamily: 'Georgia, serif',
                    color: '#7a6540',
                    fontStyle: 'italic',
                  }}
                >
                  ✧ Awaiting thy inquiry... ✧
                </p>
              ) : (
                <div className="space-y-3">
                  {conversationMessages.map((msg, index) => {
                    const isUser = msg.type === 'user_message'
                    const content = getMessageContent(msg)
                    if (!content) return null

                    return (
                      <div key={index}>
                        <div
                          className="text-xs mb-1"
                          style={{
                            color: isUser ? '#654321' : '#8b6914',
                            fontFamily: 'Georgia, serif',
                            fontStyle: 'italic',
                          }}
                        >
                          {isUser ? '⁂ Visitor' : '☙ Vic Keegan'}
                        </div>
                        <div
                          className="px-3 py-2 rounded-sm"
                          style={{
                            background: isUser
                              ? 'linear-gradient(135deg, #3d3225 0%, #2a231a 100%)'
                              : 'transparent',
                            color: isUser ? '#f4ead5' : '#3d3225',
                            fontFamily: 'Georgia, serif',
                            fontSize: '0.85rem',
                            lineHeight: '1.6',
                            border: isUser ? 'none' : '1px solid rgba(139, 105, 20, 0.2)',
                          }}
                        >
                          {content}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Validation Ledger Section */}
          {showDebug && (
            <div className="px-4 pb-4">
              <button
                onClick={() => setDebugExpanded(!debugExpanded)}
                className="w-full px-4 py-3 text-left flex items-center justify-between rounded-t-sm"
                style={{
                  background: 'linear-gradient(180deg, #3d3225 0%, #2a231a 100%)',
                  color: '#d4c4a8',
                  fontFamily: 'Georgia, serif',
                  border: '1px solid #654321',
                  borderBottom: debugExpanded ? 'none' : '1px solid #654321',
                }}
              >
                <span style={{ letterSpacing: '0.05em', fontSize: '0.9rem' }}>
                  ☙ The Verification Ledger
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 text-xs"
                    style={{ background: '#654321', color: '#d4c4a8', borderRadius: '2px' }}
                  >
                    {validationLogs.length}
                  </span>
                  <span>{debugExpanded ? '▼' : '▶'}</span>
                </span>
              </button>

              {debugExpanded && (
                <div
                  className="rounded-b-sm overflow-hidden"
                  style={{
                    background: '#fffbf0',
                    border: '1px solid #654321',
                    borderTop: 'none',
                    fontFamily: 'Georgia, serif',
                    fontSize: '0.8rem',
                  }}
                >
                  {validationLogs.length === 0 ? (
                    <p className="p-4 text-center italic" style={{ color: '#7a6540' }}>
                      No entries in the ledger yet...
                    </p>
                  ) : (
                    validationLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 border-b"
                        style={{ borderColor: 'rgba(101, 67, 33, 0.15)' }}
                      >
                        {/* Query */}
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <span style={{ color: '#3d3225', fontSize: '0.8rem', flex: 1 }}>
                            "{log.user_query?.slice(0, 40)}{log.user_query?.length > 40 ? '...' : ''}"
                          </span>
                          <span
                            className="px-2 py-0.5 text-xs whitespace-nowrap"
                            style={{
                              background: log.validation_passed ? '#2d4a2d' : '#4a2d2d',
                              color: log.validation_passed ? '#a8d4a8' : '#d4a8a8',
                              borderRadius: '2px',
                            }}
                          >
                            {log.validation_passed ? '✓' : '✗'}
                          </span>
                        </div>

                        {/* Stats */}
                        <div
                          className="flex gap-3 text-xs py-1.5 px-2"
                          style={{ background: 'rgba(101, 67, 33, 0.05)', borderRadius: '2px' }}
                        >
                          <span><b>{log.articles_found}</b> articles</span>
                          <span><b>{(log.confidence_score * 100).toFixed(0)}%</b> conf.</span>
                          <span style={{ color: '#7a6540' }}>{formatTime(log.created_at)}</span>
                        </div>

                        {/* Facts */}
                        {log.facts_checked && log.facts_checked.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {log.facts_checked.slice(0, 3).map((fact, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-1.5 text-xs py-0.5 px-2"
                                style={{ background: 'rgba(45, 74, 45, 0.08)', color: '#3d5a3d', borderRadius: '2px' }}
                              >
                                <span>✓</span>
                                <span>{fact}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  {/* Footer */}
                  <div
                    className="px-3 py-2 text-center text-xs"
                    style={{ background: '#3d3225', color: '#7a6540', fontStyle: 'italic' }}
                  >
                    Pydantic AI • Est. MMXXIV
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Backdrop when open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
