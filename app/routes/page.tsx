import { getAllRoutes } from '@/lib/db'
import Link from 'next/link'

export const metadata = {
  title: 'Walking Routes | Lost London',
  description: 'Curated walking routes through London\'s hidden history. Explore themed walks with expert guidance.',
}

const DIFFICULTY_COLORS = {
  easy: 'bg-green-100 text-green-800 border-green-300',
  moderate: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  challenging: 'bg-red-100 text-red-800 border-red-300'
}

export default async function RoutesPage() {
  const routes = await getAllRoutes()

  return (
    <div className="bg-stone-50">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-12">
          <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4">
            Walking Routes
          </h1>
          <p className="text-gray-600 max-w-2xl">
            Curated walking tours through London&apos;s hidden history. Each route connects
            fascinating locations with stories you won&apos;t find in ordinary guidebooks.
          </p>
        </div>

        {routes.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {routes.map(route => (
              <Link
                key={route.id}
                href={`/routes/${route.slug}`}
                className="bg-white border border-gray-200 rounded-lg p-6 block group hover:shadow-lg hover:border-red-200 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <h2 className="font-serif text-xl text-gray-900 group-hover:text-red-700 transition-colors">
                    {route.name}
                  </h2>
                  <span className={`text-xs px-2 py-1 rounded border ${DIFFICULTY_COLORS[route.difficulty]}`}>
                    {route.difficulty}
                  </span>
                </div>

                {route.borough && (
                  <p className="text-sm text-gray-500 mb-2">{route.borough}</p>
                )}

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                  {route.description}
                </p>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <span>🚶</span>
                    {route.distance_km}km
                  </span>
                  <span className="flex items-center gap-1">
                    <span>⏱️</span>
                    {route.duration_minutes} min
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
            <div className="text-6xl mb-4">🗺️</div>
            <h2 className="text-xl font-serif text-gray-900 mb-2">Routes Coming Soon</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              We&apos;re curating walking routes through London&apos;s hidden history.
              Check back soon or explore the map in the meantime.
            </p>
            <Link href="/map" className="inline-block bg-red-700 text-white px-6 py-2 rounded hover:bg-red-800 transition-colors">
              Explore Map
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
