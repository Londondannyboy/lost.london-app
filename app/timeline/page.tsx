import { getEraStats, getArticlesByEra } from '@/lib/db'
import { TimelineVoiceSection } from '@/components/TimelineVoiceSection'
import Link from 'next/link'

export const metadata = {
  title: 'Timeline | Lost London',
  description: 'Explore London\'s history through the ages - from Roman times to the modern era.',
}

const ERA_INFO: Record<string, { years: string; description: string; color: string }> = {
  'Roman': {
    years: '43 - 410 AD',
    description: 'Londinium was founded by the Romans around AD 43. It became a major commercial hub and the capital of Roman Britain.',
    color: 'bg-red-50 border-red-200 hover:border-red-400'
  },
  'Medieval': {
    years: '410 - 1485',
    description: 'After the Romans left, London rebuilt itself into a thriving medieval city with the Tower of London and Westminster Abbey.',
    color: 'bg-amber-50 border-amber-200 hover:border-amber-400'
  },
  'Tudor': {
    years: '1485 - 1603',
    description: 'The Tudor period brought the Reformation, Shakespeare\'s Globe Theatre, and London\'s emergence as a world city.',
    color: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400'
  },
  'Stuart': {
    years: '1603 - 1714',
    description: 'A turbulent era including the Civil War, Great Plague, and Great Fire that destroyed much of the old city.',
    color: 'bg-purple-50 border-purple-200 hover:border-purple-400'
  },
  'Georgian': {
    years: '1714 - 1837',
    description: 'London expanded with elegant squares and terraces. The British Empire grew and the Industrial Revolution began.',
    color: 'bg-blue-50 border-blue-200 hover:border-blue-400'
  },
  'Victorian': {
    years: '1837 - 1901',
    description: 'The capital of the world\'s largest empire. Railways, the Underground, and iconic landmarks transformed the city.',
    color: 'bg-slate-50 border-slate-200 hover:border-slate-400'
  },
  'Modern': {
    years: '1901 - Present',
    description: 'Two world wars, the Blitz, and dramatic reinvention. London remains one of the world\'s great cities.',
    color: 'bg-stone-50 border-stone-300 hover:border-stone-400'
  }
}

export default async function TimelinePage({
  searchParams
}: {
  searchParams: Promise<{ era?: string }>
}) {
  const params = await searchParams
  const stats = await getEraStats()
  const selectedEra = params.era

  // Get articles for selected era
  let articles: Awaited<ReturnType<typeof getArticlesByEra>> = []
  if (selectedEra) {
    articles = await getArticlesByEra(selectedEra)
  }

  return (
    <div className="bg-stone-50">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-12">
          <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4">
            Journey Through Time
          </h1>
          <p className="text-gray-600 max-w-2xl">
            Explore London&apos;s rich history from Roman Londinium to the modern metropolis.
            Select an era to discover its hidden stories.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative mb-12">
          {/* Timeline line */}
          <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gray-200" />

          <div className="space-y-6">
            {Object.entries(ERA_INFO).map(([era, info], index) => {
              const stat = stats.find(s => s.era === era)
              const count = stat?.count || 0
              const isSelected = selectedEra === era

              return (
                <div
                  key={era}
                  className={`relative flex items-center ${
                    index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  {/* Timeline dot */}
                  <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full bg-red-700 border-4 border-stone-50 z-10" />

                  {/* Era card */}
                  <div className={`flex-1 ${index % 2 === 0 ? 'md:pr-12' : 'md:pl-12'}`}>
                    <Link
                      href={isSelected ? '/timeline' : `/timeline?era=${era}`}
                      className={`block p-6 rounded-xl border-2 transition-all ${info.color} ${
                        isSelected
                          ? 'ring-2 ring-red-700 shadow-lg'
                          : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h2 className="text-xl font-serif font-bold text-gray-900">{era}</h2>
                          <p className="text-sm text-gray-500">{info.years}</p>
                        </div>
                        <span className="text-2xl font-serif text-red-700">{count}</span>
                      </div>
                      <p className="text-sm text-gray-600">{info.description}</p>
                    </Link>
                  </div>

                  {/* Spacer for alternating layout */}
                  <div className="hidden md:block flex-1" />
                </div>
              )
            })}
          </div>
        </div>

        {/* Articles for selected era */}
        {selectedEra && articles.length > 0 && (
          <div className="mt-12">
            {/* VIC Voice Widget for this era */}
            <div className="mb-8">
              <TimelineVoiceSection
                era={selectedEra}
                eraInfo={ERA_INFO[selectedEra]}
                articles={articles.map(a => ({
                  title: a.title,
                  excerpt: a.excerpt || ''
                }))}
              />
            </div>

            <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6">
              {selectedEra} Era Articles
              <span className="text-gray-500 text-lg font-normal ml-2">({articles.length})</span>
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map(article => (
                <Link
                  key={article.id}
                  href={`/article/${article.slug}`}
                  className="bg-white border border-gray-200 rounded-lg p-4 block hover:shadow-lg hover:border-red-200 transition-all"
                >
                  {article.featured_image_url && (
                    <img
                      src={article.featured_image_url}
                      alt={article.title}
                      className="w-full h-40 object-cover rounded-lg mb-3"
                    />
                  )}
                  <h3 className="font-serif text-gray-900 mb-2">{article.title}</h3>
                  {article.year_from && (
                    <p className="text-xs text-red-700 mb-2">
                      {article.year_from}{article.year_to && article.year_to !== article.year_from ? ` - ${article.year_to}` : ''}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 line-clamp-2">{article.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {selectedEra && articles.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-600">
              No articles found for the {selectedEra} era yet.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
