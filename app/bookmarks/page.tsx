'use client'

import { useEffect, useState } from 'react'
import { useBookmarks } from '@/hooks/useBookmarks'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Article {
  id: number
  title: string
  slug: string
  excerpt: string
  featured_image_url?: string
  author: string
}

export default function BookmarksPage() {
  const router = useRouter()
  const { bookmarks, loading: bookmarksLoading, removeBookmark, isLoggedIn } = useBookmarks()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  // Redirect to sign-in if not logged in
  useEffect(() => {
    if (!bookmarksLoading && !isLoggedIn) {
      router.push('/auth/sign-in')
    }
  }, [bookmarksLoading, isLoggedIn, router])

  useEffect(() => {
    if (!bookmarksLoading && bookmarks.length > 0) {
      fetchArticles()
    } else if (!bookmarksLoading) {
      setLoading(false)
    }
  }, [bookmarks, bookmarksLoading])

  const fetchArticles = async () => {
    try {
      const res = await fetch('/api/london-tools/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: bookmarks })
      })
      const data = await res.json()
      if (data.success) {
        setArticles(data.articles)
      }
    } catch (error) {
      console.error('Failed to fetch bookmarked articles:', error)
    } finally {
      setLoading(false)
    }
  }

  // Show loading while checking auth
  if (bookmarksLoading || !isLoggedIn) {
    return (
      <div className="bg-stone-50">
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="text-gray-500">Loading...</div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-stone-50">
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2">
            My Bookmarks
          </h1>
          <p className="text-gray-600">
            Your saved articles, synced across all your devices.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                    <div className="h-4 bg-gray-200 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : articles.length > 0 ? (
          <div className="space-y-4">
            {articles.map(article => (
              <div key={article.id} className="bg-white border border-gray-200 rounded-lg p-4 flex gap-4 items-start hover:shadow-md transition-shadow">
                <Link href={`/article/${article.slug}`} className="flex-shrink-0">
                  {article.featured_image_url ? (
                    <img
                      src={article.featured_image_url}
                      alt={article.title}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">📜</span>
                    </div>
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/article/${article.slug}`}>
                    <h2 className="font-serif text-gray-900 hover:text-red-700 transition-colors">
                      {article.title}
                    </h2>
                  </Link>
                  <p className="text-sm text-gray-500 mt-1">By {article.author}</p>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                    {article.excerpt}
                  </p>
                </div>
                <button
                  onClick={() => removeBookmark(article.id)}
                  className="text-red-500 hover:text-red-700 p-2"
                  title="Remove from bookmarks"
                >
                  ♥
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-xl font-serif text-gray-900 mb-2">No bookmarks yet</h2>
            <p className="text-gray-600 mb-6">
              Start exploring and save articles you want to read later.
            </p>
            <Link href="/surprise" className="inline-block bg-red-700 text-white px-6 py-2 rounded hover:bg-red-800 transition-colors">
              Surprise Me
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
