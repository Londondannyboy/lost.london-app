'use client'

import { useState, useEffect } from 'react'

const WATERSTONES_URL = 'https://www.waterstones.com/author/vic-keegan/4942784'

export function BuyBookBanner() {
  const [dismissed, setDismissed] = useState(true) // Start hidden to avoid flash

  useEffect(() => {
    // Check if banner was dismissed in this session
    const isDismissed = sessionStorage.getItem('book_banner_dismissed')
    setDismissed(!!isDismissed)
  }, [])

  const handleDismiss = () => {
    sessionStorage.setItem('book_banner_dismissed', 'true')
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-r from-amber-900 via-amber-800 to-amber-900 text-white shadow-lg">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <a href={WATERSTONES_URL} target="_blank" rel="noopener noreferrer" className="shrink-0">
            <img
              src="/lost-london-cover-1.jpg"
              alt="Lost London Book"
              className="w-12 h-16 object-cover rounded shadow-md hover:scale-105 transition-transform"
            />
          </a>
          <div>
            <p className="font-bold text-sm md:text-base">
              Get the Lost London books
            </p>
            <p className="text-amber-200 text-xs md:text-sm">
              Own Vic Keegan's complete collection of hidden London stories
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <a
            href={WATERSTONES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-white text-amber-900 font-bold text-sm rounded hover:bg-amber-100 transition-colors"
          >
            Buy at Waterstones
          </a>
          <button
            onClick={handleDismiss}
            className="p-1 text-amber-300 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// Inline CTA for use within pages
export function BuyBookCTA({ className = '' }: { className?: string }) {
  return (
    <a
      href={WATERSTONES_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-3 bg-amber-900 text-white px-6 py-3 rounded-lg hover:bg-amber-800 transition-colors group ${className}`}
    >
      <img
        src="/lost-london-cover-1.jpg"
        alt="Lost London"
        className="w-10 h-14 object-cover rounded shadow group-hover:scale-105 transition-transform"
      />
      <div>
        <p className="font-bold">Buy the Books</p>
        <p className="text-amber-200 text-sm">Available at Waterstones</p>
      </div>
    </a>
  )
}
