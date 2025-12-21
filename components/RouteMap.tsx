'use client'

import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import Link from 'next/link'

interface RouteStop {
  id: number
  stop_order: number
  walking_notes?: string
  article?: {
    id: number
    title: string
    slug: string
    latitude?: number
    longitude?: number
    location_name?: string
  }
}

interface RouteMapProps {
  stops: RouteStop[]
}

export function RouteMap({ stops }: RouteMapProps) {
  const [mounted, setMounted] = useState(false)
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
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-full h-full bg-stone-100 flex items-center justify-center">
        <div className="text-gray-500">Loading map...</div>
      </div>
    )
  }

  // Filter stops with valid coordinates
  const validStops = stops.filter(s => s.article?.latitude && s.article?.longitude)

  if (validStops.length === 0) {
    return (
      <div className="w-full h-full bg-stone-100 flex items-center justify-center">
        <div className="text-gray-500">No location data available</div>
      </div>
    )
  }

  // Calculate center and bounds
  const positions = validStops.map(s => [s.article!.latitude!, s.article!.longitude!] as [number, number])
  const center: [number, number] = [
    positions.reduce((sum, p) => sum + p[0], 0) / positions.length,
    positions.reduce((sum, p) => sum + p[1], 0) / positions.length
  ]

  return (
    <MapContainer
      center={center}
      zoom={14}
      className="w-full h-full"
      style={{ background: '#f5f5f4' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />

      {/* Route line */}
      <Polyline
        positions={positions}
        color="#b91c1c"
        weight={3}
        opacity={0.8}
        dashArray="10, 10"
      />

      {/* Markers */}
      {validStops.map((stop) => (
        <Marker
          key={stop.id}
          position={[stop.article!.latitude!, stop.article!.longitude!]}
        >
          <Popup>
            <div className="min-w-[180px]">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                  {stop.stop_order}
                </span>
                <span className="font-bold text-gray-900 text-sm">
                  {stop.article!.title}
                </span>
              </div>
              {stop.article!.location_name && (
                <p className="text-xs text-gray-500 mb-2">{stop.article!.location_name}</p>
              )}
              <Link
                href={`/article/${stop.article!.slug}`}
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                Read more →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
