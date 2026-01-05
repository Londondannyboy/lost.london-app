import { SearchBar } from '@/components/SearchBar'
import { neon } from '@neondatabase/serverless'
import Link from 'next/link'

export const metadata = {
  title: 'All Articles | Lost London',
  description: 'Browse and search 372 articles about London\'s hidden history. Filter by category or search for specific topics.',
}

async function getArticleStats() {
  const sql = neon(process.env.DATABASE_URL!)

  const stats = await sql`
    SELECT
      COUNT(*) as total_articles,
      COUNT(DISTINCT historical_era) as eras,
      COUNT(DISTINCT borough) as boroughs
    FROM articles
  `

  return stats[0]
}

async function getPopularCategories() {
  const sql = neon(process.env.DATABASE_URL!)

  const categories = await sql`
    SELECT c.name, COUNT(ac.article_id) as article_count
    FROM categories c
    JOIN article_categories ac ON c.id = ac.category_id
    GROUP BY c.id, c.name
    HAVING COUNT(ac.article_id) > 0
    ORDER BY COUNT(ac.article_id) DESC
    LIMIT 12
  `

  return categories
}

async function getSeries() {
  const sql = neon(process.env.DATABASE_URL!)

  const series = await sql`
    SELECT id, name, slug, article_count
    FROM series
    WHERE article_count > 0
    ORDER BY article_count DESC
  `

  return series
}

export default async function ArticlesPage() {
  const [stats, categories, series] = await Promise.all([
    getArticleStats(),
    getPopularCategories(),
    getSeries(),
  ])

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="bg-black text-white py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Articles</h1>
          <p className="text-gray-300 mb-2">
            {stats.total_articles} articles exploring London's hidden history
          </p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Search Section */}
        <section className="mb-12">
          <SearchBar />
        </section>

        {/* Series Section */}
        {series.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-bold mb-6 pb-2 border-b-2 border-black inline-block">
              Browse by Series
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {series.map((s: any) => (
                <Link
                  key={s.id}
                  href={`/series/${s.slug}`}
                  className="bg-gray-50 border border-gray-200 p-4 hover:border-black hover:bg-white transition-all group"
                >
                  <h3 className="font-bold text-gray-900 group-hover:underline">
                    {s.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {s.article_count} articles
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Quick Links */}
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-6 pb-2 border-b-2 border-black inline-block">
            Quick Links
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/map"
              className="px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors"
            >
              View Map
            </Link>
            <Link
              href="/surprise"
              className="px-4 py-2 border border-black hover:bg-black hover:text-white transition-colors"
            >
              Surprise Me
            </Link>
            <Link
              href="/"
              className="px-4 py-2 border border-black hover:bg-black hover:text-white transition-colors"
            >
              Talk to VIC
            </Link>
          </div>
        </section>

        {/* About */}
        <section className="bg-gray-50 rounded-lg p-8">
          <h2 className="text-xl font-bold mb-4">About the Archive</h2>
          <p className="text-gray-600 mb-4">
            These {stats.total_articles} articles were written by Vic Keegan and originally published on londonmylondon.co.uk and onlondon.co.uk. They cover 2,000 years of London history, from Roman baths to Victorian railways.
          </p>
          <p className="text-gray-500 text-sm">
            Use the search above to find specific topics, or filter by category to explore themed collections.
          </p>
        </section>
      </main>
    </div>
  )
}
