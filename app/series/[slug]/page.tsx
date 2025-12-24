import { getSeriesBySlug, getArticlesBySeries } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const series = await getSeriesBySlug(slug)

  if (!series) return { title: 'Series Not Found' }

  return {
    title: `${series.name} | Article Series | Lost London`,
    description: series.description || `Explore the ${series.name} series - ${series.article_count} articles about London's history.`
  }
}

export default async function SeriesDetailPage({ params }: Props) {
  const { slug } = await params
  const series = await getSeriesBySlug(slug)

  if (!series) {
    notFound()
  }

  const articles = await getArticlesBySeries(series.id)

  return (
    <div className="bg-stone-50">
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Series header */}
        <div className="mb-8">
          <Link href="/series" className="text-sm text-gray-500 hover:text-red-700 mb-4 inline-block">
            ← Back to series
          </Link>
          <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">{series.name}</h1>
          <p className="text-red-700">{articles.length} articles in this series</p>
        </div>

        {/* Series description */}
        {series.description && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
            <p className="text-gray-700 leading-relaxed">{series.description}</p>
          </div>
        )}

        {/* Articles list */}
        <div className="space-y-4">
          {articles.map((article, index) => (
            <Link
              key={article.id}
              href={`/article/${article.slug}`}
              className="bg-white border border-gray-200 rounded-lg p-4 flex gap-4 items-start group hover:shadow-lg hover:border-red-200 transition-all block"
            >
              {/* Article number */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-700 flex items-center justify-center text-white font-bold text-sm">
                {article.series_position || index + 1}
              </div>

              {/* Article content */}
              <div className="flex-1 min-w-0">
                <div className="flex gap-4">
                  {article.featured_image_url && (
                    <img
                      src={article.featured_image_url}
                      alt={article.title}
                      className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="font-serif text-gray-900 group-hover:text-red-700 transition-colors">
                      {article.title}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">By {article.author}</p>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {article.excerpt}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {articles.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-600">No articles in this series yet.</p>
          </div>
        )}
      </main>
    </div>
  )
}
