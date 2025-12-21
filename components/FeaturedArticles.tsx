'use client'

import { useState, useEffect } from 'react'

interface Article {
  id: number
  title: string
  slug: string
  excerpt: string
  featured_image_url: string
  url: string
  author: string
}

export function FeaturedArticles() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchArticles() {
      try {
        const response = await fetch('/api/london-tools/featured')
        const data = await response.json()
        setArticles(data.articles || [])
      } catch (error) {
        console.error('Failed to fetch featured articles:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchArticles()
  }, [])

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-london-900/50 rounded-xl overflow-hidden animate-pulse">
            <div className="aspect-video bg-london-800/50" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-london-800/50 rounded w-3/4" />
              <div className="h-3 bg-london-800/50 rounded w-full" />
              <div className="h-3 bg-london-800/50 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {articles.map((article) => (
        <a
          key={article.id}
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group bg-london-900/60 rounded-xl overflow-hidden border border-london-700/30 hover:border-gold-500/50 transition-all hover:shadow-[0_0_30px_rgba(212,165,10,0.15)]"
        >
          <div className="aspect-video overflow-hidden">
            <img
              src={article.featured_image_url}
              alt={article.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/lost-london-cover-1.jpg'
              }}
            />
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-white text-sm mb-2 line-clamp-2 group-hover:text-gold-400 transition-colors">
              {article.title}
            </h3>
            {article.excerpt && (
              <p className="text-white/60 text-xs line-clamp-2 mb-3">
                {article.excerpt}
              </p>
            )}
            <span className="text-gold-400 text-xs font-medium group-hover:text-gold-300">
              Read article →
            </span>
          </div>
        </a>
      ))}
    </div>
  )
}
