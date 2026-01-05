'use client'

import { useEffect, useState } from 'react'
import { authClient } from '@/lib/auth/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface UserQuery {
  id: number
  query: string
  article_id: number | null
  article_title: string | null
  article_slug: string | null
  session_id: string | null
  created_at: string
}

interface UniqueTopic {
  topic: string
  count: number
  last_asked: string
  article_title: string | null
  article_slug: string | null
}

interface Article {
  id: number
  title: string
  slug: string
  excerpt: string
  featured_image_url?: string
}

export default function DashboardPage() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const [queries, setQueries] = useState<UserQuery[]>([])
  const [uniqueTopics, setUniqueTopics] = useState<UniqueTopic[]>([])
  const [recommendedArticles, setRecommendedArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'conversations' | 'topics'>('conversations')

  // Redirect to sign-in if not logged in (after loading completes)
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/auth/sign-in?redirect=/dashboard')
    }
  }, [isPending, session, router])

  // Fetch user query history
  useEffect(() => {
    if (session?.user) {
      fetchQueryHistory()
    }
  }, [session?.user])

  const fetchQueryHistory = async () => {
    try {
      const res = await fetch('/api/user/queries?limit=50')
      const data = await res.json()

      if (!data.error) {
        setQueries(data.queries || [])
        setUniqueTopics(data.uniqueTopics || [])

        // Get recommendations based on topics
        if (data.uniqueTopics?.length > 0) {
          fetchRecommendations(data.uniqueTopics)
        }
      }
    } catch (error) {
      console.error('Failed to fetch query history:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecommendations = async (topics: UniqueTopic[]) => {
    // Use top topics to find recommendations
    const topTopics = topics.slice(0, 3).map(t => t.topic).join(' ')
    const viewedSlugs = topics.map(t => t.article_slug).filter(Boolean)

    try {
      const res = await fetch('/api/london-tools/semantic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: topTopics,
          limit: 10,
        }),
      })
      const data = await res.json()

      if (data.success || data.articles) {
        // Filter out already viewed articles
        const recommendations = (data.articles || []).filter(
          (a: Article) => !viewedSlugs.includes(a.slug)
        ).slice(0, 5)
        setRecommendedArticles(recommendations)
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error)
    }
  }

  const formatDate = (timestamp: string) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  // Show loading while checking auth
  if (isPending || !session?.user) {
    return (
      <div className="bg-stone-50">
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="text-gray-500">Loading your dashboard...</div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-stone-50">
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white rounded-xl p-8 mb-8">
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2">
            My History
          </h1>
          <p className="text-white/80 mb-4">
            Your conversations and discoveries with VIC
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{queries.length}</div>
              <div className="text-xs text-white/70">Questions Asked</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{uniqueTopics.length}</div>
              <div className="text-xs text-white/70">Topics Explored</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('conversations')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'conversations'
                ? 'border-b-2 border-slate-700 text-slate-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Conversations
          </button>
          <button
            onClick={() => setActiveTab('topics')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'topics'
                ? 'border-b-2 border-slate-700 text-slate-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Topics & Articles
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Conversations Tab */}
            {activeTab === 'conversations' && (
              <div>
                {queries.length > 0 ? (
                  <div className="space-y-3">
                    {queries.map(query => (
                      <div
                        key={query.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">💬</span>
                              <span className="text-gray-700 font-medium">
                                "{query.query}"
                              </span>
                            </div>
                            {query.article_title && query.article_slug && (
                              <Link
                                href={`/article/${query.article_slug}`}
                                className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-red-700 transition-colors"
                              >
                                <span>📄</span>
                                <span className="underline">{query.article_title}</span>
                                <span className="text-gray-400">→</span>
                              </Link>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {formatDate(query.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <div className="text-4xl mb-3">💬</div>
                    <h3 className="font-medium text-gray-900 mb-1">No conversations yet</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Ask VIC about London history and your questions will appear here
                    </p>
                    <Link
                      href="/"
                      className="inline-block text-sm text-red-700 hover:text-red-800"
                    >
                      Talk to VIC
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Topics Tab */}
            {activeTab === 'topics' && (
              <div>
                {uniqueTopics.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Topics you've explored with VIC, linked to related articles:
                    </p>
                    <div className="space-y-3">
                      {uniqueTopics.map((topic, i) => (
                        <div
                          key={i}
                          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900 capitalize">
                                  {topic.topic}
                                </span>
                                {topic.count > 1 && (
                                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                    Asked {topic.count}x
                                  </span>
                                )}
                              </div>
                              {topic.article_title && topic.article_slug && (
                                <Link
                                  href={`/article/${topic.article_slug}`}
                                  className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-red-700 transition-colors"
                                >
                                  <span>📄</span>
                                  <span className="underline">{topic.article_title}</span>
                                  <span className="text-gray-400">→</span>
                                </Link>
                              )}
                            </div>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {formatDate(topic.last_asked)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <div className="text-4xl mb-3">🗺️</div>
                    <h3 className="font-medium text-gray-900 mb-1">No topics yet</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Chat with VIC about London history to build your topic list
                    </p>
                    <Link
                      href="/"
                      className="inline-block text-sm text-red-700 hover:text-red-800"
                    >
                      Talk to VIC
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Recommended Articles Section */}
            {recommendedArticles.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-serif font-bold text-gray-900 mb-4">
                  Recommended For You
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendedArticles.map(article => (
                    <Link
                      key={article.id}
                      href={`/article/${article.slug}`}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow flex gap-3"
                    >
                      {article.featured_image_url ? (
                        <img
                          src={article.featured_image_url}
                          alt={article.title}
                          className="w-16 h-16 object-cover rounded flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                          <span className="text-xl">📜</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 hover:text-red-700">
                          {article.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {article.excerpt}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </>
        )}
      </main>
    </div>
  )
}
