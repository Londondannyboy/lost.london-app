'use client'

import { useEffect, useState } from 'react'
import { authClient } from '@/lib/auth/client'
import { getUserId } from '@/lib/hybrid-memory'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface ArticleView {
  id: string
  metadata: {
    articleId?: number
    articleSlug?: string
    articleTitle?: string
    categories?: string[]
  }
  timestamp: string
}

interface SearchItem {
  id: string
  metadata: {
    query?: string
  }
  timestamp: string
}

interface ActivityData {
  articleViews: ArticleView[]
  searches: SearchItem[]
  topics: string[]
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
  const [activity, setActivity] = useState<ActivityData | null>(null)
  const [recommendedArticles, setRecommendedArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const [activeTab, setActiveTab] = useState<'viewed' | 'topics' | 'searches'>('viewed')

  // Get the appropriate userId
  const userId = session?.user?.id || (typeof window !== 'undefined' ? getUserId() : '')

  // Redirect to sign-in if not logged in (after loading completes)
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/auth/sign-in?redirect=/dashboard')
    }
  }, [isPending, session, router])

  // Fetch user activity
  useEffect(() => {
    if (userId) {
      fetchActivity()
    }
  }, [userId])

  const fetchActivity = async () => {
    try {
      const res = await fetch('/api/memory/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, limit: 50 }),
      })
      const data = await res.json()

      if (data.success) {
        setActivity(data.activities)

        // Get recommended articles based on viewed categories
        if (data.activities.articleViews?.length > 0) {
          fetchRecommendations(data.activities.articleViews)
        }
      }
    } catch (error) {
      console.error('Failed to fetch activity:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecommendations = async (views: ArticleView[]) => {
    // Extract all categories from viewed articles
    const allCategories = views.flatMap(v => v.metadata?.categories || [])
    const uniqueCategories = [...new Set(allCategories)].slice(0, 3)
    const viewedIds = views.map(v => v.metadata?.articleId).filter(Boolean)

    if (uniqueCategories.length === 0) return

    try {
      // Search for articles in similar categories (semantic search)
      const res = await fetch('/api/london-tools/semantic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: uniqueCategories.join(' '),
          limit: 10,
        }),
      })
      const data = await res.json()

      if (data.success) {
        // Filter out already viewed articles
        const recommendations = data.articles.filter(
          (a: Article) => !viewedIds.includes(a.id)
        ).slice(0, 5)
        setRecommendedArticles(recommendations)
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error)
    }
  }

  const clearHistory = async (type: 'all' | 'article_views' | 'searches' | 'topics' = 'all') => {
    if (!confirm(`Are you sure you want to clear your ${type === 'all' ? 'entire' : type.replace('_', ' ')} history? This cannot be undone.`)) {
      return
    }

    setClearing(true)
    try {
      const res = await fetch('/api/memory/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, clearType: type }),
      })
      const data = await res.json()

      if (data.success) {
        // Refresh activity
        fetchActivity()
      }
    } catch (error) {
      console.error('Failed to clear history:', error)
    } finally {
      setClearing(false)
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
            Your Journey
          </h1>
          <p className="text-white/80 mb-4">
            Track your exploration of London's hidden history with VIC
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{activity?.articleViews?.length || 0}</div>
              <div className="text-xs text-white/70">Articles Read</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{activity?.topics?.length || 0}</div>
              <div className="text-xs text-white/70">Topics Explored</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{activity?.searches?.length || 0}</div>
              <div className="text-xs text-white/70">Searches Made</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('viewed')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'viewed'
                ? 'border-b-2 border-slate-700 text-slate-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Recently Viewed
          </button>
          <button
            onClick={() => setActiveTab('topics')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'topics'
                ? 'border-b-2 border-slate-700 text-slate-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Topics
          </button>
          <button
            onClick={() => setActiveTab('searches')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'searches'
                ? 'border-b-2 border-slate-700 text-slate-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Searches
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
            {/* Recently Viewed Tab */}
            {activeTab === 'viewed' && (
              <div>
                {activity?.articleViews && activity.articleViews.length > 0 ? (
                  <div className="space-y-3">
                    {activity.articleViews.map(view => (
                      <Link
                        key={view.id}
                        href={`/article/${view.metadata?.articleSlug || ''}`}
                        className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-gray-300 transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900 hover:text-red-700">
                              {view.metadata?.articleTitle || 'Unknown Article'}
                            </h3>
                            {view.metadata?.categories && view.metadata.categories.length > 0 && (
                              <div className="flex gap-2 mt-1">
                                {view.metadata.categories.slice(0, 3).map((cat, i) => (
                                  <span
                                    key={i}
                                    className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                                  >
                                    {cat}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">
                            {formatDate(view.timestamp)}
                          </span>
                        </div>
                      </Link>
                    ))}

                    <button
                      onClick={() => clearHistory('article_views')}
                      disabled={clearing}
                      className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-red-600 transition-colors"
                    >
                      {clearing ? 'Clearing...' : 'Clear viewed history'}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <div className="text-4xl mb-3">📖</div>
                    <h3 className="font-medium text-gray-900 mb-1">No articles viewed yet</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Start exploring and your reading history will appear here
                    </p>
                    <Link
                      href="/series/lost-london"
                      className="inline-block text-sm text-red-700 hover:text-red-800"
                    >
                      Browse Articles
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Topics Tab */}
            {activeTab === 'topics' && (
              <div>
                {activity?.topics && activity.topics.length > 0 ? (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <p className="text-sm text-gray-600 mb-4">
                      Topics you've discussed with VIC:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {activity.topics.map((topic, i) => (
                        <Link
                          key={i}
                          href={`/?topic=${encodeURIComponent(topic)}`}
                          className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm hover:bg-slate-200 transition-colors"
                        >
                          {topic}
                        </Link>
                      ))}
                    </div>

                    <button
                      onClick={() => clearHistory('topics')}
                      disabled={clearing}
                      className="w-full mt-6 py-2 text-sm text-gray-500 hover:text-red-600 transition-colors"
                    >
                      {clearing ? 'Clearing...' : 'Clear topic history'}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <div className="text-4xl mb-3">💬</div>
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

            {/* Searches Tab */}
            {activeTab === 'searches' && (
              <div>
                {activity?.searches && activity.searches.length > 0 ? (
                  <div className="space-y-2">
                    {activity.searches.map(search => (
                      <div
                        key={search.id}
                        className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <span className="text-gray-700">{search.metadata?.query || 'Unknown search'}</span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {formatDate(search.timestamp)}
                        </span>
                      </div>
                    ))}

                    <button
                      onClick={() => clearHistory('searches')}
                      disabled={clearing}
                      className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-red-600 transition-colors"
                    >
                      {clearing ? 'Clearing...' : 'Clear search history'}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <div className="text-4xl mb-3">🔍</div>
                    <h3 className="font-medium text-gray-900 mb-1">No searches yet</h3>
                    <p className="text-sm text-gray-500">
                      Your search history will appear here
                    </p>
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

            {/* Clear All History */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={() => clearHistory('all')}
                disabled={clearing}
                className="text-sm text-gray-400 hover:text-red-600 transition-colors"
              >
                {clearing ? 'Clearing...' : 'Clear all history'}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
