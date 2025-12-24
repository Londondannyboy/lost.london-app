'use client'

import Link from 'next/link'

export function Footer() {
  return (
    <footer className="bg-black text-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <Link href="/" className="font-serif text-xl font-bold">
              Lost London
            </Link>
            <p className="text-gray-400 text-sm mt-1">
              AI voice guide to London history
            </p>
          </div>
          <nav className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
            <Link href="/series/lost-london" className="hover:text-white transition-colors">Articles</Link>
            <Link href="/map" className="hover:text-white transition-colors">Map</Link>
            <Link href="/timeline" className="hover:text-white transition-colors">Timeline</Link>
            <Link href="/series" className="hover:text-white transition-colors">Series</Link>
            <Link href="/routes" className="hover:text-white transition-colors">Routes</Link>
            <Link href="/thorney-island" className="hover:text-white transition-colors">Book</Link>
          </nav>
        </div>
        <div className="border-t border-gray-800 mt-6 pt-6 text-center text-xs text-gray-500">
          <p>
            Original articles by Vic Keegan from{' '}
            <a href="https://www.londonmylondon.co.uk" className="underline hover:text-gray-300" target="_blank" rel="noopener noreferrer">londonmylondon.co.uk</a>
            {' '}and{' '}
            <a href="https://www.onlondon.co.uk" className="underline hover:text-gray-300" target="_blank" rel="noopener noreferrer">onlondon.co.uk</a>
          </p>
        </div>
      </div>
    </footer>
  )
}
