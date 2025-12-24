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
        <div className="absolute inset-0 bg-amber-400/30 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Logo image - larger size */}
        <img
          src="/Lost London Logo.png"
          alt="Lost London"
          className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover shadow-xl border-3 border-amber-300/60 group-hover:border-amber-400 transition-all duration-300 group-hover:scale-110"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}
        />
      </div>
    </Link>
  )
}
