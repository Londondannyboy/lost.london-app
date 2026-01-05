'use client'

import { useEffect, useState } from 'react'
import { authClient } from '@/lib/auth/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'

// Dynamically import 3D graph to avoid SSR issues
const InterestGraph3D = dynamic(() => import('@/components/InterestGraph3D'), { ssr: false })
import { InterestConfirmation } from '@/components/InterestConfirmation'

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

interface ZepFact {
  fact: string
  created_at: string
  source: string | null
  target: string | null
}

interface ArticleNode {
  article_id: number
  article_title: string
  article_slug: string
  count: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()
  const [queries, setQueries] = useState<UserQuery[]>([])
  const [uniqueTopics, setUniqueTopics] = useState<UniqueTopic[]>([])
  const [recommendedArticles, setRecommendedArticles] = useState<Article[]>([])
  const [zepFacts, setZepFacts] = useState<ZepFact[]>([])
  const [articleNodes, setArticleNodes] = useState<ArticleNode[]>([])
  const [loading, setLoading] = useState(true)

  // Redirect to sign-in if not logged in (after loading completes)
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/auth/sign-in?redirect=/dashboard')
    }
  }, [isPending, session, router])

  // Fetch user query history and Zep data
  useEffect(() => {
    if (session?.user) {
      fetchQueryHistory()
      fetchZepData()
    }
  }, [session?.user])

  const fetchZepData = async () => {
    if (!session?.user?.id) return

    const CLM_URL = 'https://vic-clm.vercel.app'

    try {
      const factsRes = await fetch(`${CLM_URL}/api/user/${session.user.id}/facts`)
      const factsData = await factsRes.json()

      if (factsData.facts) {
        setZepFacts(factsData.facts)
      }
    } catch (error) {
      console.error('Failed to fetch Zep data:', error)
    }
  }

  const fetchQueryHistory = async () => {
    try {
      const res = await fetch('/api/user/queries?limit=50')
      const data = await res.json()

      if (!data.error) {
        setQueries(data.queries || [])
        setUniqueTopics(data.uniqueTopics || [])

        // Build article nodes for graph - only validated articles from DB
        const articleMap = new Map<number, ArticleNode>()
        for (const q of (data.queries || [])) {
          if (q.article_id && q.article_title && q.article_slug) {
            const existing = articleMap.get(q.article_id)
            if (existing) {
              existing.count++
            } else {
              articleMap.set(q.article_id, {
                article_id: q.article_id,
                article_title: q.article_title,
                article_slug: q.article_slug,
                count: 1
              })
            }
          }
        }
        setArticleNodes(Array.from(articleMap.values()))

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
    <div className="bg-stone-50 min-h-screen">
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
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{queries.length}</div>
              <div className="text-xs text-white/70">Questions</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{uniqueTopics.length}</div>
              <div className="text-xs text-white/70">Topics</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{zepFacts.length}</div>
              <div className="text-xs text-white/70">Insights</div>
            </div>
          </div>
        </div>

        {/* Human-in-the-Loop: Pending Interest Confirmation */}
        <InterestConfirmation onUpdate={fetchQueryHistory} />

        {/* 3D Interest Graph - Showcase Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8 shadow-sm">
          <h2 className="font-serif font-bold text-gray-900 text-xl mb-2 flex items-center gap-2">
            <span>🌐</span> Your Interest Graph
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            A 3D visualization of topics you've explored with VIC. Drag to rotate, scroll to zoom.
          </p>
          <InterestGraph3D
            articles={articleNodes}
            userName={session?.user?.name || 'You'}
            height="450px"
          />
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
            {/* Topics Section - Clickable chips */}
            {uniqueTopics.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
                <h2 className="font-serif font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                  <span>🗺️</span> Topics You've Explored
                </h2>
                <div className="flex flex-wrap gap-2">
                  {uniqueTopics.map((topic, i) => (
                    <Link
                      key={i}
                      href={topic.article_slug ? `/article/${topic.article_slug}` : '#'}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        topic.article_slug
                          ? 'bg-gradient-to-r from-slate-100 to-red-50 text-slate-700 border border-slate-200 hover:border-red-300 hover:shadow-sm'
                          : 'bg-gray-100 text-gray-600 cursor-default'
                      }`}
                    >
                      <span className="capitalize">{topic.topic}</span>
                      {topic.count > 1 && (
                        <span className="ml-1.5 text-xs text-slate-500">×{topic.count}</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Conversations */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
              <h2 className="font-serif font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                <span>💬</span> Recent Conversations
              </h2>
              {queries.length > 0 ? (
                <div className="space-y-3">
                  {queries.map(query => (
                    <div
                      key={query.id}
                      className="border-b border-gray-100 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="text-gray-700 font-medium mb-1">
                            "{query.query}"
                          </div>
                          {query.article_title && query.article_slug && (
                            <Link
                              href={`/article/${query.article_slug}`}
                              className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-red-700 transition-colors group"
                            >
                              <span>📄</span>
                              <span className="underline group-hover:no-underline">{query.article_title}</span>
                              <span className="text-gray-400 group-hover:text-red-500">→</span>
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
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">💬</div>
                  <p className="text-sm text-gray-500 mb-3">
                    Ask VIC about London history and your questions will appear here
                  </p>
                  <Link
                    href="/"
                    className="inline-block text-sm text-red-700 hover:text-red-800 font-medium"
                  >
                    Talk to VIC →
                  </Link>
                </div>
              )}
            </div>

            {/* Recommended Articles Section */}
            {recommendedArticles.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
                <h2 className="font-serif font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                  <span>✨</span> Recommended For You
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendedArticles.map(article => (
                    <Link
                      key={article.id}
                      href={`/article/${article.slug}`}
                      className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
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
                        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 group-hover:text-red-700 transition-colors">
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

            {/* What VIC Remembers - Collapsed Section */}
            {zepFacts.length > 0 && (
              <details className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between">
                  <h3 className="font-serif font-bold text-gray-900 flex items-center gap-2">
                    <span>🧠</span> What VIC Remembers About You
                  </h3>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                    {zepFacts.length} insights
                  </span>
                </summary>
                <div className="px-6 pb-4 border-t border-gray-100">
                  <div className="space-y-2 max-h-64 overflow-y-auto mt-4">
                    {zepFacts.slice(0, 20).map((fact, i) => (
                      <div key={i} className="flex items-start gap-2 py-1 border-b border-gray-100 last:border-0">
                        <span className="text-gray-400">•</span>
                        <span className="text-sm text-gray-700 flex-1">{fact.fact}</span>
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {formatDate(fact.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Clear History */}
                  <div className="text-center pt-4 border-t mt-4">
                    <button
                      onClick={async () => {
                        if (confirm('Are you sure you want to clear all your VIC conversation history? This cannot be undone.')) {
                          try {
                            await fetch(`https://vic-clm.vercel.app/api/user/${session?.user?.id}/clear`, {
                              method: 'DELETE',
                            })
                            setZepFacts([])
                            alert('History cleared successfully')
                          } catch (error) {
                            alert('Failed to clear history')
                          }
                        }
                      }}
                      className="text-sm text-red-600 hover:text-red-800 underline"
                    >
                      Clear all history
                    </button>
                  </div>
                </div>
              </details>
            )}
          </>
        )}
      </main>
    </div>
  )
}
