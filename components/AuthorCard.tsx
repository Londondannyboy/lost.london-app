interface AuthorCardProps {
  name: string
  date?: string | null
}

export function AuthorCard({ name, date }: AuthorCardProps) {
  return (
    <div className="flex items-center gap-4 py-4 border-y border-gray-300">
      <img
        src="/vic-avatar.jpg"
        alt={name}
        className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
      />
      <div>
        <p className="font-serif font-bold text-black">{name}</p>
        <p className="text-sm text-gray-600">London historian & author of Lost London</p>
        {date && (
          <p className="text-xs text-gray-500 mt-1">{date}</p>
        )}
      </div>
    </div>
  )
}
