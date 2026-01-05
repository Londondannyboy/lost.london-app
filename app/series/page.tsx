import { getAllSeries } from '@/lib/db'
import Link from 'next/link'

export const metadata = {
  title: 'Article Series | Lost London',
  description: 'Explore curated series of articles about London\'s hidden history, organized by theme.',
}

export default async function SeriesPage() {
  const allSeries = await getAllSeries()
  // Only show series with articles
  const series = allSeries.filter((s: any) => s.article_count > 0)

  return (
    <div className="bg-stone-50">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-12">
          <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4">
            Article Series
          </h1>
          <p className="text-gray-600 max-w-2xl">
            Dive deep into London&apos;s history with our curated article series.
            Each series explores a specific theme through multiple connected stories.
          </p>
        </div>

        {series.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {series.map(s => (
              <Link
                key={s.id}
                href={`/series/${s.slug}`}
                className="bg-white border border-gray-200 rounded-lg p-6 block group hover:shadow-lg hover:border-red-200 transition-all"
              >
                <h2 className="font-serif text-xl text-gray-900 group-hover:text-red-700 transition-colors mb-2">
                  {s.name}
                </h2>
                <p className="text-sm text-red-700 mb-3">
                  {s.article_count} articles
                </p>
                {s.description && (
                  <p className="text-gray-600 text-sm line-clamp-3">
                    {s.description}
                  </p>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-xl font-serif text-gray-900 mb-2">Series Coming Soon</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              We&apos;re organizing articles into thematic series for easier exploration.
              Check back soon or browse individual articles.
            </p>
            <Link href="/surprise" className="inline-block bg-red-700 text-white px-6 py-2 rounded hover:bg-red-800 transition-colors">
              Discover Articles
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
