'use client'

interface ArticleTrackerProps {
  article: {
    id: number
    title: string
    slug: string
    categories?: string[]
  }
}

/**
 * Article view tracking component (placeholder)
 * Zep handles conversation memory; article tracking not implemented yet
 */
export function ArticleTracker({ article }: ArticleTrackerProps) {
  // Article tracking disabled - Zep handles conversation memory
  // Future: could track article views in Neon or Zep metadata
  return null
}
