import { VoiceWidget } from '@/components/VoiceWidget'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "London History | VIC - Your AI Guide to London's Hidden Past",
  description: "Explore London history with VIC, your AI-powered guide. Discover 139 articles about London's hidden history, medieval secrets, Shakespeare's theatres, and forgotten stories.",
  keywords: ["London history", "London hidden history", "medieval London", "Shakespeare London", "London walks", "London secrets", "London guide"],
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-london-950 via-london-900 to-black relative overflow-hidden">
      {/* London fog ambient effect */}
      <div className="london-fog" aria-hidden="true" />

      {/* Dramatic radial gradient background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(41,82,204,0.15)_0%,transparent_70%)]" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-london-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gold-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Main Content */}
      <main className="relative z-10">
        {/* Hero Section with Voice Widget */}
        <section className="max-w-4xl mx-auto px-4 pt-16 pb-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold mb-4 text-gradient-london">
              London History Brought to Life
            </h1>
            <p className="text-xl md:text-2xl text-london-300/80 mb-2">
              Your AI Guide to London's Hidden Past
            </p>
            <p className="text-london-400/60 text-sm max-w-lg mx-auto">
              By Vic Keegan — 372 articles exploring <strong>London history</strong>, hidden gems, and forgotten corners of the city
            </p>
          </div>

          {/* Lost London Hero Image */}
          <div className="relative w-full max-w-3xl mx-auto mb-12 rounded-2xl overflow-hidden border border-gold-500/30 shadow-[0_0_40px_rgba(212,165,10,0.15)]">
            <img
              src="/lost-london-cover-1.jpg"
              alt="Vic Keegan's Lost London - Exploring the hidden history of the capital"
              className="w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-london-950/90 via-london-950/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-gold-400 text-xs font-semibold uppercase tracking-wider mb-1">
                Vic Keegan's Lost London
              </p>
              <p className="text-white/90 text-sm font-medium">
                Discover 2,000 years of hidden history through voice
              </p>
            </div>
          </div>

          {/* Voice Widget - Main Interaction */}
          <div className="my-12">
            <VoiceWidget />
          </div>
        </section>

        {/* What You Can Ask Section */}
        <section className="py-16 bg-gradient-to-b from-london-950/50 to-black border-t border-london-800/30">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-center mb-4 text-london-200">
              Explore London History with VIC
            </h2>
            <p className="text-london-400 text-center mb-12 max-w-xl mx-auto">
              VIC knows about London history spanning Roman times to the present day. From hidden rivers to lost theatres, just ask.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-london-900/60 rounded-xl p-6 border border-london-700/30 hover:border-london-500/50 transition-all">
                <div className="text-2xl mb-3">🏛️</div>
                <h3 className="font-semibold text-london-200 mb-2">Medieval London History</h3>
                <p className="text-london-400 text-sm">
                  "Tell me about the medieval buildings still standing in London"
                </p>
              </div>
              <div className="bg-london-900/60 rounded-xl p-6 border border-london-700/30 hover:border-london-500/50 transition-all">
                <div className="text-2xl mb-3">🎭</div>
                <h3 className="font-semibold text-london-200 mb-2">Shakespeare's London</h3>
                <p className="text-london-400 text-sm">
                  "Where did Shakespeare live and perform in London?"
                </p>
              </div>
              <div className="bg-london-900/60 rounded-xl p-6 border border-london-700/30 hover:border-london-500/50 transition-all">
                <div className="text-2xl mb-3">🌊</div>
                <h3 className="font-semibold text-london-200 mb-2">Thames History</h3>
                <p className="text-london-400 text-sm">
                  "What secrets does the Thames hide at low tide?"
                </p>
              </div>
              <div className="bg-london-900/60 rounded-xl p-6 border border-london-700/30 hover:border-london-500/50 transition-all">
                <div className="text-2xl mb-3">💎</div>
                <h3 className="font-semibold text-london-200 mb-2">Hidden Gems</h3>
                <p className="text-london-400 text-sm">
                  "What are London's best kept historical secrets?"
                </p>
              </div>
              <div className="bg-london-900/60 rounded-xl p-6 border border-london-700/30 hover:border-london-500/50 transition-all">
                <div className="text-2xl mb-3">🚶</div>
                <h3 className="font-semibold text-london-200 mb-2">Historical Walks</h3>
                <p className="text-london-400 text-sm">
                  "Can I walk from Trafalgar Square to Margate without crossing a road?"
                </p>
              </div>
              <div className="bg-london-900/60 rounded-xl p-6 border border-london-700/30 hover:border-london-500/50 transition-all">
                <div className="text-2xl mb-3">🎲</div>
                <h3 className="font-semibold text-london-200 mb-2">Surprise Me</h3>
                <p className="text-london-400 text-sm">
                  "Tell me something fascinating about London history I don't know"
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* London History Topics Section */}
        <section className="py-16 bg-london-950/30 border-t border-london-800/30">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-center mb-4 text-london-200">
              London History Topics We Cover
            </h2>
            <p className="text-london-400 text-center mb-12 max-w-2xl mx-auto">
              Our collection spans centuries of London history, from Roman Londinium to Victorian innovations and beyond.
            </p>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-semibold text-gold-400 mb-4">Ancient & Medieval London History</h4>
                <ul className="space-y-2 text-london-300/80">
                  <li>• Roman baths hidden beneath City offices</li>
                  <li>• Medieval monks and their lasting legacy</li>
                  <li>• Britain's oldest door and England's oldest garden</li>
                  <li>• The lost rivers: Tyburn, Fleet, and Walbrook</li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gold-400 mb-4">Tudor & Stuart London History</h4>
                <ul className="space-y-2 text-london-300/80">
                  <li>• Shakespeare's lost theatres: The Curtain & Blackfriars</li>
                  <li>• Henry VIII's hidden wine cellar</li>
                  <li>• The Mayflower's voyage from Rotherhithe</li>
                  <li>• Berry Brothers: the world's oldest wine shop</li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gold-400 mb-4">Victorian & Modern London History</h4>
                <ul className="space-y-2 text-london-300/80">
                  <li>• The world's first skyscraper in Petty France</li>
                  <li>• The Necropolis Railway: trains for the dead</li>
                  <li>• Crystal Palace: London's Wonder of the World</li>
                  <li>• When Monet painted the Thames</li>
                </ul>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gold-400 mb-4">Hidden London History</h4>
                <ul className="space-y-2 text-london-300/80">
                  <li>• Secret gardens in the heart of Westminster</li>
                  <li>• Underground mysteries of the Old Bailey</li>
                  <li>• The buried history under Somerset House</li>
                  <li>• London's abandoned bridges and forgotten paths</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Book Covers Gallery */}
        <section className="py-16 bg-london-950/50 border-t border-london-800/30">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-center mb-4 text-london-200">
              Vic Keegan's Lost London
            </h2>
            <p className="text-london-400 text-center mb-12 max-w-xl mx-auto">
              A treasure trove of London's hidden history, now available as beautifully illustrated books
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="group relative rounded-xl overflow-hidden border border-london-700/30 hover:border-gold-500/50 transition-all hover:shadow-[0_0_30px_rgba(212,165,10,0.2)]">
                <img src="/lost-london-cover-1.jpg" alt="Lost London Volume 1" className="w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="group relative rounded-xl overflow-hidden border border-london-700/30 hover:border-gold-500/50 transition-all hover:shadow-[0_0_30px_rgba(212,165,10,0.2)]">
                <img src="/lost-london-cover-2.jpg" alt="Lost London Volume 2" className="w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="group relative rounded-xl overflow-hidden border border-london-700/30 hover:border-gold-500/50 transition-all hover:shadow-[0_0_30px_rgba(212,165,10,0.2)]">
                <img src="/lost-london-cover-3.jpg" alt="Lost London Volume 3" className="w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="py-16 bg-black border-t border-london-800/30">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6 text-london-200">
              About Our London History Collection
            </h2>
            <p className="text-london-300/80 text-lg leading-relaxed mb-6">
              This collection brings together 372 articles by Vic Keegan, a passionate explorer of <strong>London history</strong> and its hidden corners.
              From Shakespeare's lost theatres to the source of the Thames, from medieval buildings to modern art —
              VIC is your voice-powered guide to discovering London history like never before.
            </p>
            <p className="text-london-400/60 text-sm">
              Original articles from <a href="https://www.londonmylondon.co.uk" target="_blank" rel="noopener noreferrer" className="text-london-300 hover:text-gold-400 transition-colors">londonmylondon.co.uk</a> and <a href="https://www.onlondon.co.uk" target="_blank" rel="noopener noreferrer" className="text-london-300 hover:text-gold-400 transition-colors">onlondon.co.uk</a>
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-london-800/30 py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-london-500/60 text-sm">
            VIC — Your AI guide to London history, powered by voice
          </p>
        </div>
      </footer>
    </div>
  )
}
