'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface NearbyArticle {
  id: number
  title: string
  slug: string
  excerpt: string
  featured_image_url?: string
  latitude: number
  longitude: number
  location_name?: string
  distance_km: number
}

export default function NearbyPage() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [articles, setArticles] = useState<NearbyArticle[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [radius, setRadius] = useState(2) // km

  const requestLocation = () => {
    setLoading(true)
    setError(null)

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        })
      },
      (err) => {
        setError(
          err.code === 1
            ? 'Location access denied. Please enable location services.'
            : 'Unable to get your location. Please try again.'
        )
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  useEffect(() => {
    if (location) {
      fetchNearbyArticles()
    }
  }, [location, radius])

  const fetchNearbyArticles = async () => {
    if (!location) return

    setLoading(true)
    try {
      const res = await fetch(
        `/api/london-tools/nearby?lat=${location.lat}&lng=${location.lng}&radius=${radius}`
      )
      const data = await res.json()
      if (data.success) {
        setArticles(data.articles)
      } else {
        setError('Failed to fetch nearby locations')
      }
    } catch (err) {
      setError('Failed to fetch nearby locations')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-serif text-gradient-london mb-4">
            What&apos;s Near Me
          </h1>
          <p className="text-gray-400">
            Discover London&apos;s hidden history around your current location
          </p>
        </div>

        {!location && !loading && (
          <div className="text-center py-12">
            <div className="inline-block p-8 article-card">
              <div className="text-6xl mb-4">📍</div>
              <h2 className="text-xl font-serif text-white mb-4">
                Enable Location Services
              </h2>
              <p className="text-gray-400 mb-6 max-w-md">
                Allow access to your location to discover historical sites and stories near you.
              </p>
              <button
                onClick={requestLocation}
                className="btn-london"
              >
                Find Nearby Locations
              </button>
            </div>
          </div>
        )}

        {loading && !location && (
          <div className="text-center py-12">
            <div className="animate-pulse">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-gray-400">Getting your location...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <div className="inline-block p-6 bg-red-900/20 border border-red-700 rounded-lg">
              <p className="text-red-400">{error}</p>
              <button
                onClick={requestLocation}
                className="mt-4 text-sm text-london-400 hover:text-london-300"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {location && (
          <>
            {/* Radius selector */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <span className="text-gray-400">Search radius:</span>
              {[0.5, 1, 2, 5].map((r) => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    radius === r
                      ? 'bg-london-600 text-white'
                      : 'bg-london-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {r < 1 ? `${r * 1000}m` : `${r}km`}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-pulse text-gray-400">
                  Searching for nearby locations...
                </div>
              </div>
            ) : articles.length > 0 ? (
              <div className="space-y-4">
                {articles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/article/${article.slug}`}
                    className="article-card p-4 flex gap-4 items-start"
                  >
                    {article.featured_image_url && (
                      <img
                        src={article.featured_image_url}
                        alt={article.title}
                        className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <h2 className="font-serif text-white">{article.title}</h2>
                        <span className="text-sm text-gold-400 whitespace-nowrap">
                          {article.distance_km < 1
                            ? `${Math.round(article.distance_km * 1000)}m`
                            : `${article.distance_km.toFixed(1)}km`}
                        </span>
                      </div>
                      {article.location_name && (
                        <p className="text-sm text-gray-500 mt-1">{article.location_name}</p>
                      )}
                      <p className="text-sm text-gray-400 mt-2 line-clamp-2">
                        {article.excerpt}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">
                  No historical locations found within {radius}km.
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Try increasing the search radius or exploring a different area.
                </p>
              </div>
            )}

            {/* Map link */}
            <div className="text-center mt-8">
              <Link
                href="/map"
                className="text-london-400 hover:text-london-300"
              >
                View all locations on map →
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
