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
  categories?: string[]
}

interface Category {
  name: string
  article_count: number
}

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Article[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/london-tools/categories')
        const data = await response.json()
        setCategories(data.categories || [])
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      }
    }
    fetchCategories()
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setSearched(true)
    setSelectedCategory(null)

    try {
      const response = await fetch('/api/london-tools/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      })
      const data = await response.json()
      setResults(data.articles || [])
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryFilter = async (categoryName: string) => {
    if (selectedCategory === categoryName) {
      // Deselect
      setSelectedCategory(null)
      setResults([])
      setSearched(false)
      return
    }

    setLoading(true)
    setSearched(true)
    setSelectedCategory(categoryName)
    setQuery('')

    try {
      const response = await fetch('/api/london-tools/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: categoryName }),
      })
      const data = await response.json()
      setResults(data.articles || [])
    } catch (error) {
      console.error('Category filter failed:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setSearched(false)
    setSelectedCategory(null)
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Search Form */}
      <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search 372 articles... (e.g., Shakespeare, Thames, medieval)"
          className="w-full px-6 py-4 bg-london-900/80 border border-london-700/50 rounded-full text-white placeholder-white/40 focus:outline-none focus:border-gold-500/50 focus:shadow-[0_0_20px_rgba(212,165,10,0.15)] transition-all text-lg"
        />
        <button
          type="submit"
          disabled={loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-gold-500 hover:bg-gold-400 text-black font-semibold rounded-full transition-all disabled:opacity-50"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          ) : (
            'Search'
          )}
        </button>
      </form>

      {/* Category Filters */}
      {categories.length > 0 && (
        <div className="mt-6">
          <p className="text-white/60 text-sm text-center mb-3">Or filter by category:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => handleCategoryFilter(cat.name)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === cat.name
                    ? 'bg-gold-500 text-black'
                    : 'bg-london-800/60 text-white/80 hover:bg-london-700/60 hover:text-white border border-london-600/30'
                }`}
              >
                {cat.name}
                <span className={`ml-1.5 text-xs ${selectedCategory === cat.name ? 'text-black/60' : 'text-white/50'}`}>
                  {cat.article_count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {searched && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/70 text-sm">
              {loading
                ? 'Searching...'
                : selectedCategory
                  ? `${results.length} article${results.length !== 1 ? 's' : ''} in "${selectedCategory}"`
                  : `Found ${results.length} article${results.length !== 1 ? 's' : ''}`
              }
            </p>
            {(results.length > 0 || selectedCategory) && (
              <button
                onClick={clearSearch}
                className="text-gold-400 hover:text-gold-300 text-sm"
              >
                Clear results
              </button>
            )}
          </div>

          {results.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2">
              {results.map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-london-900/60 rounded-lg overflow-hidden border border-london-700/30 hover:border-gold-500/50 transition-all"
                >
                  {article.featured_image_url && (
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={article.featured_image_url}
                        alt={article.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <h4 className="font-semibold text-white text-sm mb-2 line-clamp-2 group-hover:text-gold-400 transition-colors">
                      {article.title}
                    </h4>
                    {article.excerpt && (
                      <p className="text-white/60 text-xs line-clamp-2">
                        {article.excerpt}
                      </p>
                    )}
                    {article.categories && article.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {article.categories.slice(0, 3).map((cat) => (
                          <span key={cat} className="text-xs px-2 py-0.5 bg-london-800/50 text-white/50 rounded">
                            {cat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}

          {searched && !loading && results.length === 0 && (
            <p className="text-white/50 text-center py-8">
              No articles found. Try a different search term or category.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
