'use client'

const WATERSTONES_URL = 'https://www.waterstones.com/author/vic-keegan/4942784'

export function LogoBadge() {
  return (
    <a
      href={WATERSTONES_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed top-16 left-4 z-40 group"
      title="Buy the Lost London books at Waterstones"
    >
      <div className="relative">
        {/* Glow effect on hover */}
        <div className="absolute inset-0 bg-amber-400/30 rounded blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Book cover image */}
        <div className="relative">
          <img
            src="/lost-london-cover-1.jpg"
            alt="Buy Lost London"
            className="w-14 h-20 md:w-16 md:h-24 object-cover rounded shadow-xl border-2 border-amber-300/60 group-hover:border-amber-400 transition-all duration-300 group-hover:scale-105"
            style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
          />
          {/* Buy label */}
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap">
            BUY BOOK
          </span>
        </div>
      </div>
    </a>
  )
}
