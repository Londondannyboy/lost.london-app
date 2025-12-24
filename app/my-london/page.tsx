'use client'

import { useEffect, useState } from 'react'
import { useBookmarks } from '@/hooks/useBookmarks'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Location {
  id: number
  title: string
  slug: string
  location_name: string
  latitude: number
  longitude: number
  borough: string
  visited: boolean
}

interface NearbyPub {
  name: string
  address: string
  rating?: number
  distance?: string
  isRecommended?: boolean
}

export default function MyLondonPage() {
  const router = useRouter()
  const { bookmarks, loading: bookmarksLoading, isLoggedIn } = useBookmarks()
  const [locations, setLocations] = useState<Location[]>([])
  const [visitedIds, setVisitedIds] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'checklist' | 'itinerary' | 'pubs'>('checklist')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [nearbyPubs, setNearbyPubs] = useState<NearbyPub[]>([])
  const [loadingPubs, setLoadingPubs] = useState(false)

  // Redirect to sign-in if not logged in
  useEffect(() => {
    if (!bookmarksLoading && !isLoggedIn) {
      router.push('/auth/sign-in?redirect=/my-london')
    }
  }, [bookmarksLoading, isLoggedIn, router])

  // Fetch user's visited locations and bookmarked places
  useEffect(() => {
    if (!bookmarksLoading && isLoggedIn) {
      fetchUserData()
    }
  }, [bookmarksLoading, isLoggedIn, bookmarks])

  const fetchUserData = async () => {
    try {
      // Fetch visited locations
      const visitedRes = await fetch('/api/user/visited')
      const visitedData = await visitedRes.json()
      if (visitedData.success) {
        setVisitedIds(visitedData.visited || [])
      }

      // Fetch locations from bookmarked articles
      if (bookmarks.length > 0) {
        const locRes = await fetch('/api/london-tools/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: bookmarks })
        })
        const locData = await locRes.json()
        if (locData.success) {
          setLocations(locData.locations.map((loc: any) => ({
            ...loc,
            visited: visitedData.visited?.includes(loc.id) || false
          })))
        }
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleVisited = async (locationId: number) => {
    const isCurrentlyVisited = visitedIds.includes(locationId)
    const newVisitedIds = isCurrentlyVisited
      ? visitedIds.filter(id => id !== locationId)
      : [...visitedIds, locationId]

    setVisitedIds(newVisitedIds)
    setLocations(locations.map(loc =>
      loc.id === locationId ? { ...loc, visited: !isCurrentlyVisited } : loc
    ))

    try {
      await fetch('/api/user/visited', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId,
          action: isCurrentlyVisited ? 'remove' : 'add'
        })
      })
    } catch (error) {
      console.error('Failed to update visited status:', error)
    }
  }

  const findNearbyPubs = () => {
    setLoadingPubs(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation({ lat: latitude, lng: longitude })

          try {
            const res = await fetch(`/api/nearby-pubs?lat=${latitude}&lng=${longitude}`)
            const data = await res.json()
            if (data.success) {
              setNearbyPubs(data.pubs)
            }
          } catch (error) {
            console.error('Failed to fetch pubs:', error)
            // Fallback to recommended pubs
            setNearbyPubs([
              { name: 'The Lamb and Flag', address: 'Rose Street, Covent Garden', rating: 4.5, isRecommended: true },
              { name: 'Ye Olde Cheshire Cheese', address: 'Fleet Street', rating: 4.3, isRecommended: true },
              { name: 'The George Inn', address: 'Borough High Street', rating: 4.6, isRecommended: true },
            ])
          }
          setLoadingPubs(false)
        },
        () => {
          // Location denied - show recommended pubs
          setNearbyPubs([
            { name: 'The Lamb and Flag', address: 'Rose Street, Covent Garden', rating: 4.5, isRecommended: true },
            { name: 'Ye Olde Cheshire Cheese', address: 'Fleet Street', rating: 4.3, isRecommended: true },
            { name: 'The George Inn', address: 'Borough High Street', rating: 4.6, isRecommended: true },
          ])
          setLoadingPubs(false)
        }
      )
    }
  }

  const visitedCount = locations.filter(l => l.visited).length
  const totalLocations = locations.length
  const progressPercent = totalLocations > 0 ? (visitedCount / totalLocations) * 100 : 0

  if (bookmarksLoading || !isLoggedIn) {
    return (
      <div className="bg-stone-50">
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="text-gray-500">Loading your London...</div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-stone-50">
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-red-700 to-red-900 text-white rounded-xl p-8 mb-8">
          <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2">
            My London
          </h1>
          <p className="text-white/80 mb-6">
            Your personal journey through London's hidden history
          </p>

          {/* Progress */}
          <div className="bg-white/20 rounded-full h-4 mb-2">
            <div
              className="bg-white rounded-full h-4 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-sm text-white/80">
            {visitedCount} of {totalLocations} locations visited
            {visitedCount > 0 && visitedCount === totalLocations && ' - You did it!'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('checklist')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'checklist'
                ? 'border-b-2 border-red-700 text-red-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Checklist
          </button>
          <button
            onClick={() => setActiveTab('itinerary')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'itinerary'
                ? 'border-b-2 border-red-700 text-red-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Walking Route
          </button>
          <button
            onClick={() => {
              setActiveTab('pubs')
              if (nearbyPubs.length === 0) findNearbyPubs()
            }}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'pubs'
                ? 'border-b-2 border-red-700 text-red-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Nearby Pubs
          </button>
        </div>

        {/* Checklist Tab */}
        {activeTab === 'checklist' && (
          <div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="w-6 h-6 bg-gray-200 rounded" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : locations.length > 0 ? (
              <div className="space-y-3">
                {locations.map(location => (
                  <div
                    key={location.id}
                    className={`bg-white border rounded-lg p-4 transition-all ${
                      location.visited
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleVisited(location.id)}
                        className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                          location.visited
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300 hover:border-green-400'
                        }`}
                      >
                        {location.visited && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1">
                        <Link href={`/article/${location.slug}`}>
                          <h3 className={`font-medium hover:text-red-700 ${
                            location.visited ? 'text-green-800' : 'text-gray-900'
                          }`}>
                            {location.title}
                          </h3>
                        </Link>
                        <p className="text-sm text-gray-500">
                          {location.location_name}
                          {location.borough && ` • ${location.borough}`}
                        </p>
                      </div>
                      <Link
                        href={`https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`}
                        target="_blank"
                        className="text-gray-400 hover:text-red-700 p-2"
                        title="Get directions"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                <div className="text-6xl mb-4">📍</div>
                <h2 className="text-xl font-serif text-gray-900 mb-2">No locations yet</h2>
                <p className="text-gray-600 mb-6">
                  Bookmark some articles to start building your London checklist!
                </p>
                <Link href="/series/lost-london" className="inline-block bg-red-700 text-white px-6 py-2 rounded hover:bg-red-800">
                  Browse Articles
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Itinerary Tab */}
        {activeTab === 'itinerary' && (
          <div>
            {locations.length > 1 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-xl font-serif font-bold text-gray-900 mb-4">
                  Your Walking Route
                </h2>
                <p className="text-gray-600 mb-6">
                  Visit these {locations.filter(l => !l.visited).length} remaining locations in order:
                </p>

                <div className="space-y-4 mb-6">
                  {locations.filter(l => !l.visited).map((location, index) => (
                    <div key={location.id} className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-red-700 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {index + 1}
                      </div>
                      <div>
                        <Link href={`/article/${location.slug}`} className="font-medium text-gray-900 hover:text-red-700">
                          {location.title}
                        </Link>
                        <p className="text-sm text-gray-500">{location.location_name}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <a
                  href={`https://www.google.com/maps/dir/${locations
                    .filter(l => !l.visited)
                    .map(l => `${l.latitude},${l.longitude}`)
                    .join('/')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-red-700 text-white px-6 py-3 rounded-lg hover:bg-red-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Open in Google Maps
                </a>
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                <div className="text-6xl mb-4">🚶</div>
                <h2 className="text-xl font-serif text-gray-900 mb-2">Build your route</h2>
                <p className="text-gray-600 mb-6">
                  Bookmark at least 2 locations to create a walking route.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Pubs Tab */}
        {activeTab === 'pubs' && (
          <div>
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-xl font-serif font-bold text-gray-900 mb-2">
                Nearby Historic Pubs
              </h2>
              <p className="text-gray-600 mb-6">
                After exploring, reward yourself at one of London's finest establishments.
              </p>

              {loadingPubs ? (
                <div className="text-center py-8">
                  <div className="inline-block w-8 h-8 border-2 border-red-700 border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-gray-500">Finding pubs near you...</p>
                </div>
              ) : nearbyPubs.length > 0 ? (
                <div className="space-y-4">
                  {nearbyPubs.map((pub, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 ${
                        pub.isRecommended
                          ? 'border-amber-300 bg-amber-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">{pub.name}</h3>
                            {pub.isRecommended && (
                              <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                                VIC Recommends
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">{pub.address}</p>
                          {pub.distance && (
                            <p className="text-sm text-gray-400">{pub.distance}</p>
                          )}
                        </div>
                        {pub.rating && (
                          <div className="flex items-center gap-1 text-amber-500">
                            <span>★</span>
                            <span className="text-gray-700">{pub.rating}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  onClick={findNearbyPubs}
                  className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-red-300 hover:text-red-700 transition-colors"
                >
                  Click to find pubs near you
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
