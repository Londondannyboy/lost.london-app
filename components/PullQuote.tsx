interface PullQuoteProps {
  children: React.ReactNode
}

export function PullQuote({ children }: PullQuoteProps) {
  return (
    <blockquote className="my-8 px-6 py-4 border-l-4 border-red-700 bg-gray-50 italic">
      <p className="text-xl font-serif text-gray-800 leading-relaxed">
        {children}
      </p>
    </blockquote>
  )
}
