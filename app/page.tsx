import { VoiceWidget } from '@/components/VoiceWidget'
import { FeaturedArticles } from '@/components/FeaturedArticles'
import { SearchBar } from '@/components/SearchBar'
import { Header } from '@/components/Header'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Lost London | VIC - Your AI Guide to London's Hidden Past",
  description: "Explore London history with VIC, your AI-powered guide. Discover 372 articles about London's hidden history, medieval secrets, Shakespeare's theatres, and forgotten stories.",
  keywords: ["London history", "London hidden history", "medieval London", "Shakespeare London", "London walks", "London secrets", "London guide"],
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-stone-50 text-black">
      {/* Navigation Header */}
      <Header />

      {/* Colorful Banner with Book Cover */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/lost-london-cover-1.jpg"
            alt="Lost London"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 md:py-16">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-black text-white tracking-tight drop-shadow-lg">
              Lost London
            </h1>
            <p className="text-base md:text-lg text-white/90 mt-3 font-serif italic drop-shadow">
              372 articles exploring the hidden history of the capital
            </p>
            <p className="text-sm text-white/70 mt-2">By Vic Keegan</p>
          </div>
        </div>
      </header>

      {/* Voice Widget with Map Background */}
      <section className="relative">
        <div className="absolute inset-0 z-0">
          <img
            src="/Map of London.jpg"
            alt="Map of London"
            className="w-full h-full object-cover opacity-10"
          />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 py-12 md:py-16">
          <VoiceWidget />
        </div>
      </section>

      {/* Main Content */}
      <main>
        {/* Search Section */}
        <section className="py-12 border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-black mb-2">
              Search the Archive
            </h2>
            <p className="text-gray-600 mb-6">
              Explore 372 articles spanning 2,000 years of London history
            </p>
            <SearchBar />
          </div>
        </section>

        {/* Thorney Island - Featured Book Section */}
        <section className="py-12 border-b border-gray-200 bg-stone-100">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="md:w-1/3">
                <div className="aspect-[3/4] overflow-hidden border-2 border-black shadow-lg">
                  <img
                    src="/lost-london-cover-3.jpg"
                    alt="Thorney Island - Lost London Volume 3"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="md:w-2/3">
                <span className="inline-block bg-black text-white text-xs px-3 py-1 mb-3 font-bold tracking-wide">
                  NEW BOOK
                </span>
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-black mb-4">
                  Thorney Island
                </h2>
                <p className="text-lg text-gray-700 font-serif leading-relaxed mb-4">
                  The hidden island at the heart of Westminster. Beneath Parliament, Westminster Abbey, and the Supreme Court lies an ancient island formed by the River Tyburn and the Thames — a place where kings ruled, monks prayed, and history was made.
                </p>
                <p className="text-gray-600 mb-6">
                  Explore 56 chapters covering the River Tyburn, the Gatehouse prison, the Devil's Acre, William Caxton, Edward the Confessor, and centuries of hidden history.
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {['River Tyburn', 'Westminster Abbey', 'Devil\'s Acre', 'William Caxton', 'Medieval History', 'King Cnut'].map((tag) => (
                    <span key={tag} className="px-3 py-1 text-xs bg-white text-gray-700 border border-gray-300">
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-gray-500 italic">
                  Ask VIC about Thorney Island — the knowledge base is ready to explore
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Topics Section - Newspaper Style */}
        <section className="py-12 border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-black mb-8 pb-2 border-b-2 border-black inline-block">
              Topics
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div>
                <h3 className="text-lg font-serif font-bold text-black mb-3 pb-1 border-b border-gray-300">
                  Ancient & Medieval
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li><a href="/api/london-tools/search?q=roman+baths" className="hover:text-black hover:underline">Roman baths beneath City offices</a></li>
                  <li><a href="/api/london-tools/search?q=medieval+monks" className="hover:text-black hover:underline">Medieval monks and their legacy</a></li>
                  <li><a href="/api/london-tools/search?q=oldest+door+garden" className="hover:text-black hover:underline">Britain's oldest door</a></li>
                  <li><a href="/api/london-tools/search?q=tyburn+fleet+walbrook" className="hover:text-black hover:underline">The lost rivers</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-black mb-3 pb-1 border-b border-gray-300">
                  Tudor & Stuart
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li><a href="/api/london-tools/search?q=shakespeare+theatre" className="hover:text-black hover:underline">Shakespeare's lost theatres</a></li>
                  <li><a href="/api/london-tools/search?q=henry+viii+wine+cellar" className="hover:text-black hover:underline">Henry VIII's wine cellar</a></li>
                  <li><a href="/api/london-tools/search?q=mayflower+rotherhithe" className="hover:text-black hover:underline">The Mayflower's voyage</a></li>
                  <li><a href="/api/london-tools/search?q=berry+brothers+wine" className="hover:text-black hover:underline">World's oldest wine shop</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-black mb-3 pb-1 border-b border-gray-300">
                  Victorian & Modern
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li><a href="/api/london-tools/search?q=skyscraper+petty+france" className="hover:text-black hover:underline">The first skyscraper</a></li>
                  <li><a href="/api/london-tools/search?q=necropolis+railway" className="hover:text-black hover:underline">The Necropolis Railway</a></li>
                  <li><a href="/api/london-tools/search?q=crystal+palace" className="hover:text-black hover:underline">Crystal Palace</a></li>
                  <li><a href="/api/london-tools/search?q=monet+thames" className="hover:text-black hover:underline">When Monet painted the Thames</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-black mb-3 pb-1 border-b border-gray-300">
                  Hidden London
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li><a href="/api/london-tools/search?q=secret+gardens+westminster" className="hover:text-black hover:underline">Westminster's secret gardens</a></li>
                  <li><a href="/api/london-tools/search?q=old+bailey+underground" className="hover:text-black hover:underline">Old Bailey's underground</a></li>
                  <li><a href="/api/london-tools/search?q=somerset+house+buried" className="hover:text-black hover:underline">Under Somerset House</a></li>
                  <li><a href="/api/london-tools/search?q=abandoned+bridges" className="hover:text-black hover:underline">Abandoned bridges</a></li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Articles */}
        <section className="py-12 border-b border-gray-200 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-black mb-8 pb-2 border-b-2 border-black inline-block">
              Featured Articles
            </h2>
            <FeaturedArticles />

            {/* Load More Articles */}
            <div className="mt-12 text-center">
              <Link
                href="/series/lost-london"
                className="inline-block bg-black text-white px-8 py-3 font-serif text-lg hover:bg-gray-800 transition-colors"
              >
                Browse All Articles →
              </Link>
              <p className="mt-3 text-gray-500 text-sm">
                Explore all 372 articles in the Lost London collection
              </p>
            </div>
          </div>
        </section>

        {/* Books Section */}
        <section className="py-12 border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-black mb-2">
              The Books
            </h2>
            <p className="text-gray-600 mb-8">
              Vic Keegan's Lost London — beautifully illustrated collections
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {/* Lost London 1 */}
              <a
                href="https://www.amazon.co.uk/Lost-London-Vic-Keegan/dp/0954076273"
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
              >
                <div className="aspect-[3/4] overflow-hidden border border-gray-200 rounded">
                  <img src="/lost-london-cover-1.jpg" alt="Lost London Volume 1" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <p className="mt-2 text-sm text-gray-600 group-hover:text-black">Lost London Vol. 1 →</p>
              </a>

              {/* Lost London 2 */}
              <a
                href="https://www.amazon.co.uk/Lost-London-2-Vic-Keegan/dp/0954076281"
                target="_blank"
                rel="noopener noreferrer"
                className="group block"
              >
                <div className="aspect-[3/4] overflow-hidden border border-gray-200 rounded">
                  <img src="/lost-london-cover-2.jpg" alt="Lost London Volume 2" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <p className="mt-2 text-sm text-gray-600 group-hover:text-black">Lost London Vol. 2 →</p>
              </a>

              {/* Lost London 3 - Coming Soon */}
              <div className="relative">
                <div className="aspect-[3/4] overflow-hidden border border-gray-200 rounded">
                  <img src="/lost-london-cover-3.jpg" alt="Lost London Volume 3" className="w-full h-full object-cover opacity-60" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-black text-white px-4 py-2 font-serif text-sm">Coming Soon</span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-400">Lost London Vol. 3</p>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="py-12">
          <div className="max-w-3xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-black mb-6">
              About
            </h2>
            <p className="text-gray-700 text-lg leading-relaxed mb-4 font-serif">
              This collection brings together 372 articles by Vic Keegan, a passionate explorer of London's history and its hidden corners. From Shakespeare's lost theatres to the source of the Thames, from medieval buildings to modern art — VIC is your voice-powered guide to discovering London like never before.
            </p>
            <p className="text-gray-500 text-sm">
              Original articles from{' '}
              <a href="https://www.londonmylondon.co.uk" target="_blank" rel="noopener noreferrer" className="underline hover:text-black">londonmylondon.co.uk</a>
              {' '}and{' '}
              <a href="https://www.onlondon.co.uk" target="_blank" rel="noopener noreferrer" className="underline hover:text-black">onlondon.co.uk</a>
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-black py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="font-serif text-black font-bold text-lg mb-2">Lost London</p>
          <p className="text-gray-500 text-sm">
            VIC — Your AI guide to London history, powered by voice
          </p>
        </div>
      </footer>
    </div>
  )
}
