import { VoiceWidget } from '@/components/VoiceWidget'
import { FeaturedArticles } from '@/components/FeaturedArticles'
import { SearchBar } from '@/components/SearchBar'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "London History | VIC - Your AI Guide to London's Hidden Past",
  description: "Explore London history with VIC, your AI-powered guide. Discover 139 articles about London's hidden history, medieval secrets, Shakespeare's theatres, and forgotten stories.",
  keywords: ["London history", "London hidden history", "medieval London", "Shakespeare London", "London walks", "London secrets", "London guide"],
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-london-950 via-london-900 to-black relative overflow-hidden">
      {/* Full Hero Background Image */}
      <div className="fixed inset-0 z-0">
        <img
          src="/lost-london-cover-1.jpg"
          alt="Vic Keegan's Lost London"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-london-950/70 via-london-950/85 to-london-950" />
      </div>

      {/* London fog ambient effect */}
      <div className="london-fog" aria-hidden="true" />

      {/* Main Content */}
      <main className="relative z-10">
        {/* Hero Section with Voice Widget */}
        <section className="max-w-4xl mx-auto px-4 pt-12 pb-16">
          {/* Voice Widget - Main Interaction */}
          <div className="mb-16">
            <VoiceWidget />
          </div>

          {/* Header - Below Voice Widget */}
          <div className="text-center mt-8">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-serif font-bold mb-6 text-white drop-shadow-lg">
              London History Brought to Life
            </h1>
            <p className="text-2xl md:text-3xl text-white/90 mb-4 drop-shadow-md">
              Your AI Guide to London's Hidden Past
            </p>
            <p className="text-white/70 text-base max-w-xl mx-auto">
              By Vic Keegan — 372 articles exploring <strong className="text-white">London history</strong>, hidden gems, and forgotten corners of the city
            </p>
          </div>
        </section>

        {/* Search Section */}
        <section className="py-16 bg-gradient-to-b from-london-950/50 to-black border-t border-london-800/30">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-center mb-4 text-white">
              Search the Knowledge Base
            </h2>
            <p className="text-white/70 text-center mb-8 max-w-xl mx-auto">
              Explore 372 articles spanning 2,000 years of London history
            </p>
            <SearchBar />
          </div>
        </section>

        {/* London History Topics Section */}
        <section className="py-16 bg-london-950/30 border-t border-london-800/30">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-center mb-4 text-white">
              London History Topics We Cover
            </h2>
            <p className="text-white/70 text-center mb-12 max-w-2xl mx-auto">
              Our collection spans centuries of London history, from Roman Londinium to Victorian innovations and beyond.
            </p>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-semibold text-gold-400 mb-4">Ancient & Medieval London History</h4>
                <ul className="space-y-2 text-white/80">
                  <li><a href="/api/london-tools/search?q=roman+baths" className="hover:text-gold-400 transition-colors cursor-pointer">• Roman baths hidden beneath City offices</a></li>
                  <li><a href="/api/london-tools/search?q=medieval+monks" className="hover:text-gold-400 transition-colors cursor-pointer">• Medieval monks and their lasting legacy</a></li>
                  <li><a href="/api/london-tools/search?q=oldest+door+garden" className="hover:text-gold-400 transition-colors cursor-pointer">• Britain's oldest door and England's oldest garden</a></li>
                  <li><a href="/api/london-tools/search?q=tyburn+fleet+walbrook" className="hover:text-gold-400 transition-colors cursor-pointer">• The lost rivers: Tyburn, Fleet, and Walbrook</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gold-400 mb-4">Tudor & Stuart London History</h4>
                <ul className="space-y-2 text-white/80">
                  <li><a href="/api/london-tools/search?q=shakespeare+theatre" className="hover:text-gold-400 transition-colors cursor-pointer">• Shakespeare's lost theatres: The Curtain & Blackfriars</a></li>
                  <li><a href="/api/london-tools/search?q=henry+viii+wine+cellar" className="hover:text-gold-400 transition-colors cursor-pointer">• Henry VIII's hidden wine cellar</a></li>
                  <li><a href="/api/london-tools/search?q=mayflower+rotherhithe" className="hover:text-gold-400 transition-colors cursor-pointer">• The Mayflower's voyage from Rotherhithe</a></li>
                  <li><a href="/api/london-tools/search?q=berry+brothers+wine" className="hover:text-gold-400 transition-colors cursor-pointer">• Berry Brothers: the world's oldest wine shop</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gold-400 mb-4">Victorian & Modern London History</h4>
                <ul className="space-y-2 text-white/80">
                  <li><a href="/api/london-tools/search?q=skyscraper+petty+france" className="hover:text-gold-400 transition-colors cursor-pointer">• The world's first skyscraper in Petty France</a></li>
                  <li><a href="/api/london-tools/search?q=necropolis+railway" className="hover:text-gold-400 transition-colors cursor-pointer">• The Necropolis Railway: trains for the dead</a></li>
                  <li><a href="/api/london-tools/search?q=crystal+palace" className="hover:text-gold-400 transition-colors cursor-pointer">• Crystal Palace: London's Wonder of the World</a></li>
                  <li><a href="/api/london-tools/search?q=monet+thames" className="hover:text-gold-400 transition-colors cursor-pointer">• When Monet painted the Thames</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gold-400 mb-4">Hidden London History</h4>
                <ul className="space-y-2 text-white/80">
                  <li><a href="/api/london-tools/search?q=secret+gardens+westminster" className="hover:text-gold-400 transition-colors cursor-pointer">• Secret gardens in the heart of Westminster</a></li>
                  <li><a href="/api/london-tools/search?q=old+bailey+underground" className="hover:text-gold-400 transition-colors cursor-pointer">• Underground mysteries of the Old Bailey</a></li>
                  <li><a href="/api/london-tools/search?q=somerset+house+buried" className="hover:text-gold-400 transition-colors cursor-pointer">• The buried history under Somerset House</a></li>
                  <li><a href="/api/london-tools/search?q=abandoned+bridges" className="hover:text-gold-400 transition-colors cursor-pointer">• London's abandoned bridges and forgotten paths</a></li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Articles */}
        <section className="py-16 bg-london-950/50 border-t border-london-800/30">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-center mb-4 text-white">
              Featured Articles
            </h2>
            <p className="text-white/70 text-center mb-12 max-w-xl mx-auto">
              Discover hidden stories from London's rich history
            </p>
            <FeaturedArticles />
          </div>
        </section>

        {/* Book Covers Gallery */}
        <section className="py-16 bg-black border-t border-london-800/30">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-center mb-4 text-white">
              Vic Keegan's Lost London
            </h2>
            <p className="text-white/70 text-center mb-12 max-w-xl mx-auto">
              A treasure trove of London's hidden history, now available as beautifully illustrated books
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Lost London 1 */}
              <a
                href="https://www.amazon.co.uk/Lost-London-Vic-Keegan/dp/0954076273"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative rounded-xl overflow-hidden border border-london-700/30 hover:border-gold-500/50 transition-all hover:shadow-[0_0_30px_rgba(212,165,10,0.2)] block"
              >
                <div className="aspect-[3/4] overflow-hidden">
                  <img src="/lost-london-cover-1.jpg" alt="Lost London Volume 1" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                  <span className="text-gold-400 font-semibold text-sm">Buy on Amazon →</span>
                </div>
              </a>

              {/* Lost London 2 */}
              <a
                href="https://www.amazon.co.uk/Lost-London-2-Vic-Keegan/dp/0954076281"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative rounded-xl overflow-hidden border border-london-700/30 hover:border-gold-500/50 transition-all hover:shadow-[0_0_30px_rgba(212,165,10,0.2)] block"
              >
                <div className="aspect-[3/4] overflow-hidden">
                  <img src="/lost-london-cover-2.jpg" alt="Lost London Volume 2" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                  <span className="text-gold-400 font-semibold text-sm">Buy on Amazon →</span>
                </div>
              </a>

              {/* Lost London 3 - Coming Soon */}
              <div className="group relative rounded-xl overflow-hidden border border-london-700/30 transition-all">
                <div className="aspect-[3/4] overflow-hidden">
                  <img src="/lost-london-cover-3.jpg" alt="Lost London Volume 3" className="w-full h-full object-cover" />
                </div>
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-gold-400 font-serif font-bold text-2xl tracking-wide">Coming Soon</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="py-16 bg-black border-t border-london-800/30">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6 text-white">
              About Our London History Collection
            </h2>
            <p className="text-white/80 text-lg leading-relaxed mb-6">
              This collection brings together 372 articles by Vic Keegan, a passionate explorer of <strong>London history</strong> and its hidden corners.
              From Shakespeare's lost theatres to the source of the Thames, from medieval buildings to modern art —
              VIC is your voice-powered guide to discovering London history like never before.
            </p>
            <p className="text-white/60 text-sm">
              Original articles from <a href="https://www.londonmylondon.co.uk" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gold-400 transition-colors">londonmylondon.co.uk</a> and <a href="https://www.onlondon.co.uk" target="_blank" rel="noopener noreferrer" className="text-white hover:text-gold-400 transition-colors">onlondon.co.uk</a>
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-london-800/30 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-white/60 text-sm">
            VIC — Your AI guide to London history, powered by voice
          </p>
        </div>
      </footer>
    </div>
  )
}
