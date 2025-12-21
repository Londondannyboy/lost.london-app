const ERA_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  'Roman': { bg: 'bg-red-100', text: 'text-red-800', icon: '🏛️' },
  'Medieval': { bg: 'bg-amber-100', text: 'text-amber-800', icon: '⚔️' },
  'Tudor': { bg: 'bg-emerald-100', text: 'text-emerald-800', icon: '👑' },
  'Stuart': { bg: 'bg-purple-100', text: 'text-purple-800', icon: '🎭' },
  'Georgian': { bg: 'bg-blue-100', text: 'text-blue-800', icon: '🏘️' },
  'Victorian': { bg: 'bg-slate-100', text: 'text-slate-800', icon: '🎩' },
  'Modern': { bg: 'bg-gray-100', text: 'text-gray-800', icon: '🌆' },
}

interface EraBadgeProps {
  era: string
  yearFrom?: number | null
  yearTo?: number | null
  className?: string
}

export function EraBadge({ era, yearFrom, yearTo, className = '' }: EraBadgeProps) {
  const style = ERA_STYLES[era] || ERA_STYLES['Modern']

  const yearText = yearFrom
    ? yearTo && yearTo !== yearFrom
      ? `${yearFrom}–${yearTo}`
      : `c. ${yearFrom}`
    : null

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${style.bg} ${className}`}>
      <span className="text-lg">{style.icon}</span>
      <div>
        <span className={`font-semibold text-sm ${style.text}`}>{era} Era</span>
        {yearText && (
          <span className={`ml-2 text-xs ${style.text} opacity-75`}>{yearText}</span>
        )}
      </div>
    </div>
  )
}
