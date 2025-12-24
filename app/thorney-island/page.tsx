import { ThorneyIslandVoice } from '@/components/ThorneyIslandVoice'
import { neon } from '@neondatabase/serverless'

export const metadata = {
  title: 'Thorney Island | Lost London',
  description: 'Discover the hidden island beneath Westminster - where Parliament, Westminster Abbey, and the Supreme Court stand on ancient ground.',
}

async function getThorneyContent() {
  const sql = neon(process.env.DATABASE_URL!)

  const chunks = await sql`
    SELECT id, chunk_number, content
    FROM thorney_island_knowledge
    ORDER BY chunk_number
    LIMIT 20
  `

  return chunks
}

export default async function ThorneyIslandPage() {
  const chunks = await getThorneyContent()

  // Extract key topics from content for display
  const topics = [
    { name: 'River Tyburn', description: 'The hidden river that shaped the island' },
    { name: 'The Gatehouse Prison', description: 'Where poets wrote their final verses' },
    { name: "Devil's Acre", description: 'Victorian London\'s most notorious slum' },
    { name: 'Westminster Abbey', description: 'A thousand years of coronations' },
    { name: 'William Caxton', description: 'The man who brought printing to England' },
    { name: 'King Cnut', description: 'The Viking king who ruled from Thorney' },
    { name: 'Edward the Confessor', description: 'The saint who built the Abbey' },
    { name: 'The Painted Chamber', description: 'Lost medieval splendour' },
  ]

  return (
    <div className="bg-stone-50">
      {/* Hero Section */}
      <section className="relative">
        <div className="absolute inset-0">
          <img
            src="/lost-london-cover-3.jpg"
            alt="Thorney Island"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 py-16 md:py-24 text-center">
          <span className="inline-block bg-white text-black text-xs px-3 py-1 mb-4 font-bold tracking-wide">
            VIC KEEGAN'S NEW BOOK
          </span>
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-4">
            Thorney Island
          </h1>
          <p className="text-xl text-white/90 font-serif italic mb-6">
            The hidden island at the heart of Westminster
          </p>
          <p className="text-white/80 max-w-2xl mx-auto">
            Beneath Parliament, Westminster Abbey, and the Supreme Court lies an ancient island
            formed by the River Tyburn and the Thames — a place where kings ruled, monks prayed,
            and history was made.
          </p>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Voice Widget Section */}
        <section className="mb-12">
          <div className="bg-white border-2 border-black rounded-lg p-6 md:p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">
                Ask VIC About Thorney Island
              </h2>
              <p className="text-gray-600">
                I wrote 56 chapters about this hidden island. Ask me anything about its history.
              </p>
            </div>
            <ThorneyIslandVoice
              chunks={chunks.map((c: any) => ({
                content: c.content
              }))}
            />
          </div>
        </section>

        {/* Topics Grid */}
        <section className="mb-12">
          <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6 pb-2 border-b-2 border-black inline-block">
            Explore the Island
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {topics.map((topic) => (
              <div
                key={topic.name}
                className="bg-white border border-gray-200 p-4 hover:border-black hover:shadow-md transition-all cursor-pointer"
              >
                <h3 className="font-serif font-bold text-gray-900 mb-1">{topic.name}</h3>
                <p className="text-sm text-gray-600">{topic.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Content Preview */}
        <section className="mb-12">
          <h2 className="text-2xl font-serif font-bold text-gray-900 mb-6 pb-2 border-b-2 border-black inline-block">
            From the Book
          </h2>
          <div className="space-y-6">
            {chunks.slice(0, 3).map((chunk: any) => (
              <div key={chunk.id} className="bg-white border border-gray-200 p-6 rounded-lg">
                <div
                  className="prose prose-stone max-w-none"
                  style={{ whiteSpace: 'pre-line' }}
                >
                  {chunk.content.substring(0, 800)}
                  {chunk.content.length > 800 && '...'}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* About Section */}
        <section className="bg-stone-100 rounded-lg p-6 md:p-8">
          <h2 className="text-xl font-serif font-bold text-gray-900 mb-4">About This Book</h2>
          <p className="text-gray-700 mb-4">
            Thorney Island is Vic Keegan's third book in the Lost London series. It focuses entirely
            on the small island that became the heart of English power — from the monks who first
            settled here to the Parliament that governs today.
          </p>
          <p className="text-gray-600 text-sm">
            56 chapters covering 2,000 years of history, all in one extraordinary place.
          </p>
        </section>
      </main>
    </div>
  )
}
