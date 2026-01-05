import { VoiceWidget } from '@/components/VoiceWidget'
import { FeaturedArticles } from '@/components/FeaturedArticles'
import { SearchBar } from '@/components/SearchBar'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Lost London | VIC - Your AI Guide to London's Hidden Past",
  description: "Explore London history with VIC, your AI-powered guide. Discover 372 articles about London's hidden history, medieval secrets, Shakespeare's theatres, and forgotten stories.",
  keywords: ["London history", "London hidden history", "medieval London", "Shakespeare London", "London walks", "London secrets", "London guide"],
}

export default function HomePage() {
  return (
    <div className="bg-white text-black">
      {/* Hero Section - Voice First */}
      <section className="relative min-h-[80vh] flex items-center justify-center bg-[#1a1612]">
        {/* Dark River Map Background */}
        <div className="absolute inset-0 z-0">
          <img
            src="/London Map with River.jpg"
            alt=""
            className="w-full h-full object-cover opacity-40"
            style={{ filter: 'sepia(30%) contrast(1.1)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1612]/60 via-transparent to-[#1a1612]/80" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 py-16 text-center">
          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4 text-[#f4ead5]">
            Lost London
          </h1>
          <p className="text-xl md:text-2xl text-[#d4c4a8] mb-12 max-w-2xl mx-auto">
            AI-powered voice guide to 2,000 years of hidden history
          </p>

          {/* Voice Widget */}
          <VoiceWidget />
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-gray-200 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-3xl md:text-4xl font-bold">372</p>
              <p className="text-sm text-gray-500 mt-1">Articles</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold">2,000</p>
              <p className="text-sm text-gray-500 mt-1">Years of History</p>
            </div>
            <div>
              <p className="text-3xl md:text-4xl font-bold">56</p>
              <p className="text-sm text-gray-500 mt-1">Book Chapters</p>
            </div>
          </div>
        </div>
      </section>

      {/* Search Section */}
      <section className="py-16 border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6 text-center">
            Search the Archive
          </h2>
          <SearchBar />
        </div>
      </section>

      {/* Featured Book - Thorney Island */}
      <section className="py-16 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="md:w-1/3">
              <div className="aspect-[3/4] overflow-hidden bg-gray-100">
                <img
                  src="/lost-london-cover-3.jpg"
                  alt="Thorney Island"
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                />
              </div>
            </div>
            <div className="md:w-2/3">
              <span className="inline-block bg-black text-white text-xs px-3 py-1 mb-4 font-medium tracking-wide">
                FEATURED
              </span>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Thorney Island
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed mb-6">
                The hidden island beneath Westminster. Where Parliament, the Abbey, and the Supreme Court now stand was once an island formed by the River Tyburn and the Thames.
              </p>
              <p className="text-gray-500 mb-8">
                56 chapters covering the River Tyburn, the Devil's Acre, William Caxton, and centuries of hidden history.
              </p>
              <Link
                href="/thorney-island"
                className="inline-block bg-black text-white px-8 py-3 font-medium hover:bg-gray-800 transition-colors"
              >
                Explore the Book →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Browse by Series */}
      <section className="py-16 border-b border-gray-200 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Browse by Series</h2>
            <Link
              href="/series"
              className="text-sm text-gray-500 hover:text-black transition-colors"
            >
              View all series →
            </Link>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            <Link
              href="/series/lost-london"
              className="bg-white border border-gray-200 p-6 hover:border-black hover:shadow-md transition-all group"
            >
              <h3 className="font-bold text-lg mb-2 group-hover:underline">Lost London</h3>
              <p className="text-sm text-gray-500 mb-3">232 articles</p>
              <p className="text-sm text-gray-600">The complete Vic Keegan archive of hidden London stories.</p>
            </Link>
            <Link
              href="/series/shakespeares-london"
              className="bg-white border border-gray-200 p-6 hover:border-black hover:shadow-md transition-all group"
            >
              <h3 className="font-bold text-lg mb-2 group-hover:underline">Shakespeare's London</h3>
              <p className="text-sm text-gray-500 mb-3">9 articles</p>
              <p className="text-sm text-gray-600">Theatres, taverns, and tales from the Bard's city.</p>
            </Link>
            <Link
              href="/series/river-thames"
              className="bg-white border border-gray-200 p-6 hover:border-black hover:shadow-md transition-all group"
            >
              <h3 className="font-bold text-lg mb-2 group-hover:underline">River Thames</h3>
              <p className="text-sm text-gray-500 mb-3">7 articles</p>
              <p className="text-sm text-gray-600">London's artery through the ages.</p>
            </Link>
            <Link
              href="/series/hidden-rivers"
              className="bg-white border border-gray-200 p-6 hover:border-black hover:shadow-md transition-all group"
            >
              <h3 className="font-bold text-lg mb-2 group-hover:underline">Hidden Rivers</h3>
              <p className="text-sm text-gray-500 mb-3">5 articles</p>
              <p className="text-sm text-gray-600">The buried waterways beneath London's streets.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Articles */}
      <section className="py-16 border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Featured Articles</h2>
            <Link
              href="/series/lost-london"
              className="text-sm text-gray-500 hover:text-black transition-colors"
            >
              View all →
            </Link>
          </div>
          <FeaturedArticles />
        </div>
      </section>

      {/* Books Grid */}
      <section className="py-16 border-b border-gray-200 bg-gradient-to-b from-amber-50 to-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-3">Own the Books</h2>
            <p className="text-gray-600 max-w-xl mx-auto">
              Take London's hidden history home. Vic Keegan's Lost London series is available at Waterstones.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 mb-10">
            <a
              href="https://www.waterstones.com/author/vic-keegan/4942784"
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <div className="aspect-[3/4] overflow-hidden bg-gray-100 mb-3 rounded-lg shadow-lg group-hover:shadow-xl transition-shadow">
                <img
                  src="/lost-london-cover-1.jpg"
                  alt="Lost London Volume 1"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <p className="text-sm font-medium group-hover:underline">Volume 1</p>
            </a>
            <a
              href="https://www.waterstones.com/author/vic-keegan/4942784"
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <div className="aspect-[3/4] overflow-hidden bg-gray-100 mb-3 rounded-lg shadow-lg group-hover:shadow-xl transition-shadow">
                <img
                  src="/lost-london-cover-2.jpg"
                  alt="Lost London Volume 2"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <p className="text-sm font-medium group-hover:underline">Volume 2</p>
            </a>
            <a
              href="https://www.waterstones.com/author/vic-keegan/4942784"
              target="_blank"
              rel="noopener noreferrer"
              className="group"
            >
              <div className="aspect-[3/4] overflow-hidden bg-gray-100 mb-3 rounded-lg shadow-lg group-hover:shadow-xl transition-shadow">
                <img
                  src="/lost-london-cover-3.jpg"
                  alt="Thorney Island"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <p className="text-sm font-medium group-hover:underline">Thorney Island</p>
            </a>
          </div>
          {/* Buy CTA */}
          <div className="text-center">
            <a
              href="https://www.waterstones.com/author/vic-keegan/4942784"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-amber-900 text-white px-8 py-4 rounded-lg hover:bg-amber-800 transition-colors font-bold text-lg"
            >
              <span>Buy at Waterstones</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-6">About</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            372 articles by Vic Keegan exploring London's hidden corners. From Shakespeare's lost theatres to the source of the Thames — VIC is your voice-powered guide to discovering London like never before.
          </p>
          <p className="text-sm text-gray-400">
            Original articles from{' '}
            <a href="https://www.londonmylondon.co.uk" className="underline hover:text-black">londonmylondon.co.uk</a>
            {' '}and{' '}
            <a href="https://www.onlondon.co.uk" className="underline hover:text-black">onlondon.co.uk</a>
          </p>
        </div>
      </section>
    </div>
  )
}
