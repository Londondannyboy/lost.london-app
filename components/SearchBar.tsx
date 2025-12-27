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
      const articles = data.articles || []
      setResults(articles)
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleCategoryFilter = async (categoryName: string) => {
    if (selectedCategory === categoryName) {
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
      {/* Search Form - Newspaper Style */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl mx-auto">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search 372 articles..."
          className="flex-1 px-4 py-3 bg-white border-2 border-gray-300 text-black placeholder-gray-400 focus:outline-none focus:border-black transition-colors font-serif"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-black text-white font-serif font-bold hover:bg-gray-800 transition-colors disabled:bg-gray-400"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {/* Category Filters */}
      {categories.length > 0 && (
        <div className="mt-6">
          <p className="text-gray-500 text-sm text-center mb-3">Or filter by category:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => handleCategoryFilter(cat.name)}
                className={`px-3 py-1 text-sm transition-all border ${
                  selectedCategory === cat.name
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-black hover:text-black'
                }`}
              >
                {cat.name}
                <span className={`ml-1.5 text-xs ${selectedCategory === cat.name ? 'text-gray-300' : 'text-gray-400'}`}>
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
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
            <p className="text-gray-600 text-sm font-serif">
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
                className="text-gray-500 hover:text-black text-sm underline"
              >
                Clear results
              </button>
            )}
          </div>

          {results.length > 0 && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto">
              {results.map((article) => (
                <a
                  key={article.id}
                  href={`/article/${article.slug}`}
                  className="group bg-white border border-gray-200 hover:border-black transition-all"
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
                    <h4 className="font-serif font-bold text-black text-sm mb-2 line-clamp-2 group-hover:underline">
                      {article.title}
                    </h4>
                    {article.excerpt && (
                      <p className="text-gray-600 text-xs line-clamp-2">
                        {article.excerpt}
                      </p>
                    )}
                    {article.categories && article.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {article.categories.slice(0, 2).map((cat) => (
                          <span key={cat} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500">
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
            <p className="text-gray-500 text-center py-8 font-serif">
              No articles found. Try a different search term.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
