'use client'

import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import Link from 'next/link'

interface Article {
  id: number
  title: string
  slug: string
  excerpt: string
  featured_image_url?: string
  latitude?: number
  longitude?: number
  location_name?: string
  borough?: string
  historical_era?: string
}

interface MapViewProps {
  articles: Article[]
  selectedEra?: string
  selectedBorough?: string
  focusCenter?: { lat: number; lng: number }
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])
  return null
}

export function MapView({ articles, selectedEra, selectedBorough, focusCenter }: MapViewProps) {
  const [mounted, setMounted] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)
  const iconSetup = useRef(false)

  // Setup Leaflet icon on mount (client-side only)
  useEffect(() => {
    if (!iconSetup.current && typeof window !== 'undefined') {
      const DefaultIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      })
      L.Marker.prototype.options.icon = DefaultIcon
      iconSetup.current = true
    }
  }, [])

  // Filter articles - only include those with valid coordinates
  const filteredArticles = articles.filter(article => {
    if (!article.latitude || !article.longitude) return false
    if (selectedEra && article.historical_era !== selectedEra) return false
    if (selectedBorough && article.borough !== selectedBorough) return false
    return true
  }) as (Article & { latitude: number; longitude: number })[]

  // Use focusCenter if provided, otherwise calculate from articles or default to central London
  const center: [number, number] = focusCenter
    ? [focusCenter.lat, focusCenter.lng]
    : filteredArticles.length > 0
      ? [
          filteredArticles.reduce((sum, a) => sum + a.latitude, 0) / filteredArticles.length,
          filteredArticles.reduce((sum, a) => sum + a.longitude, 0) / filteredArticles.length
        ]
      : [51.5074, -0.1278]

  // Use higher zoom when focusing on specific location
  const zoom = focusCenter ? 16 : 12

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-full h-full bg-stone-100 flex items-center justify-center">
        <div className="text-gray-500">Loading map...</div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full"
        style={{ background: '#f5f5f4' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <MapController center={center} zoom={zoom} />

        {filteredArticles.map((article) => (
          <Marker
            key={article.id}
            position={[article.latitude, article.longitude]}
            eventHandlers={{
              click: () => setSelectedArticle(article)
            }}
          >
            <Popup>
              <div className="min-w-[200px] max-w-[280px]">
                {article.featured_image_url && (
                  <img
                    src={article.featured_image_url}
                    alt={article.title}
                    className="w-full h-24 object-cover rounded-t mb-2"
                  />
                )}
                <h3 className="font-serif font-bold text-gray-900 text-sm mb-1">
                  {article.title}
                </h3>
                {article.location_name && (
                  <p className="text-xs text-gray-500 mb-1">{article.location_name}</p>
                )}
                {article.historical_era && (
                  <span className="inline-block text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded mb-2">
                    {article.historical_era}
                  </span>
                )}
                <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                  {article.excerpt}
                </p>
                <Link
                  href={`/article/${article.slug}`}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  Read more →
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Article count badge */}
      <div className="absolute top-4 left-4 z-[1000] bg-white/95 backdrop-blur border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
        <span className="text-sm text-gray-700">
          <span className="font-bold text-red-700">{filteredArticles.length}</span> locations
        </span>
      </div>

      {/* Selected article panel (mobile) */}
      {selectedArticle && (
        <div className="absolute bottom-4 left-4 right-4 z-[1000] md:hidden">
          <div className="bg-white/95 backdrop-blur border border-gray-200 rounded-lg p-4 shadow-lg">
            <button
              onClick={() => setSelectedArticle(null)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-900"
            >
              ✕
            </button>
            <h3 className="font-serif font-bold text-gray-900 pr-6">{selectedArticle.title}</h3>
            {selectedArticle.location_name && (
              <p className="text-sm text-gray-500 mt-1">{selectedArticle.location_name}</p>
            )}
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{selectedArticle.excerpt}</p>
            <Link
              href={`/article/${selectedArticle.slug}`}
              className="inline-block mt-3 text-sm font-medium text-red-700 hover:text-red-800"
            >
              Read full article →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
