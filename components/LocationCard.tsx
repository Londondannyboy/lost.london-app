'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface LocationCardProps {
  name?: string | null
  borough?: string | null
  latitude?: number | null
  longitude?: number | null
}

export function LocationCard({ name, borough, latitude, longitude }: LocationCardProps) {
  const [mapUrl, setMapUrl] = useState<string | null>(null)

  useEffect(() => {
    if (latitude && longitude) {
      // Use OpenStreetMap static image
      setMapUrl(`https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.005},${latitude - 0.003},${longitude + 0.005},${latitude + 0.003}&layer=mapnik&marker=${latitude},${longitude}`)
    }
  }, [latitude, longitude])

  if (!name && !borough && !latitude) return null

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
      {mapUrl && (
        <div className="h-32 w-full">
          <iframe
            src={mapUrl}
            className="w-full h-full border-0"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-3">
        <div className="flex items-start gap-2">
          <span className="text-lg">📍</span>
          <div>
            {name && <p className="font-medium text-gray-900 text-sm">{name}</p>}
            {borough && <p className="text-xs text-gray-600">{borough}</p>}
          </div>
        </div>
        {latitude && longitude && (
          <Link
            href={`/map?lat=${latitude}&lng=${longitude}`}
            className="mt-2 inline-block text-xs text-blue-600 hover:text-blue-800"
          >
            View on full map →
          </Link>
        )}
      </div>
    </div>
  )
}
