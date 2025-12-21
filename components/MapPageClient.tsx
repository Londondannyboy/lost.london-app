'use client'

import dynamic from 'next/dynamic'

const MapView = dynamic(() => import('@/components/MapView').then(mod => mod.MapView), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-london-900 flex items-center justify-center">
      <div className="text-gray-400">Loading map...</div>
    </div>
  )
})

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

interface MapPageClientProps {
  articles: Article[]
  selectedEra?: string
  selectedBorough?: string
  eras: string[]
  boroughs: string[]
  focusCenter?: { lat: number; lng: number }
}

export function MapPageClient({ articles, selectedEra, selectedBorough, eras, boroughs, focusCenter }: MapPageClientProps) {
  return (
    <div className="flex-1 flex flex-col md:flex-row">
      {/* Filters Sidebar */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-gray-200 p-4">
        <h2 className="font-serif text-lg text-gray-900 mb-4">Filter Locations</h2>

        {/* Era Filter */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Historical Era</h3>
          <div className="flex flex-wrap gap-2">
            <a
              href="/map"
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                !selectedEra
                  ? 'bg-red-700 border-red-700 text-white'
                  : 'border-gray-300 text-gray-600 hover:border-red-700 hover:text-red-700'
              }`}
            >
              All
            </a>
            {eras.map(era => (
              <a
                key={era}
                href={`/map?era=${era}${selectedBorough ? `&borough=${selectedBorough}` : ''}`}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  selectedEra === era
                    ? 'bg-red-700 border-red-700 text-white'
                    : 'border-gray-300 text-gray-600 hover:border-red-700 hover:text-red-700'
                }`}
              >
                {era}
              </a>
            ))}
          </div>
        </div>

        {/* Borough Filter */}
        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-2">Borough</h3>
          <select
            defaultValue={selectedBorough || ''}
            onChange={(e) => {
              const borough = e.target.value
              const url = new URL(window.location.href)
              if (borough) {
                url.searchParams.set('borough', borough)
              } else {
                url.searchParams.delete('borough')
              }
              window.location.href = url.toString()
            }}
            className="w-full bg-white border border-gray-300 text-gray-700 rounded-lg px-3 py-2 text-sm focus:border-red-700 focus:outline-none"
          >
            <option value="">All Boroughs</option>
            {boroughs.map(borough => (
              <option key={borough} value={borough}>{borough}</option>
            ))}
          </select>
        </div>

        {/* Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            Showing <span className="text-red-700 font-medium">{articles.length}</span> mapped locations
          </p>
        </div>
      </aside>

      {/* Map Container */}
      <main className="flex-1 h-[calc(100vh-4rem)] md:h-auto">
        <MapView
          articles={articles}
          selectedEra={selectedEra}
          selectedBorough={selectedBorough}
          focusCenter={focusCenter}
        />
      </main>
    </div>
  )
}
