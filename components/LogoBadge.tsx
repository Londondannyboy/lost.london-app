'use client'

import Link from 'next/link'

export function LogoBadge() {
  return (
    <Link
      href="/"
      className="fixed top-4 left-4 z-50 group"
    >
      <div className="relative">
        {/* Glow effect on hover */}
        <div className="absolute inset-0 bg-amber-400/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Logo image */}
        <img
          src="/Lost London Logo.png"
          alt="Lost London"
          className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover shadow-lg border-2 border-amber-200/50 group-hover:border-amber-400 transition-all duration-300 group-hover:scale-105"
        />
      </div>
    </Link>
  )
}
