'use client'

import dynamic from 'next/dynamic'

const RouteMap = dynamic(() => import('@/components/RouteMap').then(mod => mod.RouteMap), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-stone-100 rounded-lg flex items-center justify-center">
      <div className="text-gray-500">Loading map...</div>
    </div>
  )
})

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

interface RouteMapClientProps {
  stops: RouteStop[]
}

export function RouteMapClient({ stops }: RouteMapClientProps) {
  return <RouteMap stops={stops} />
}
