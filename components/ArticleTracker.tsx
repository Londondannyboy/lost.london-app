'use client'

import { useEffect } from 'react'
import { authClient } from '@/lib/auth/client'
import { getUserId } from '@/lib/hybrid-memory'

interface ArticleTrackerProps {
  article: {
    id: number
    title: string
    slug: string
    categories?: string[]
  }
}

/**
 * Invisible component that tracks article views in Supermemory
 * This helps VIC remember what topics the user has explored
 */
export function ArticleTracker({ article }: ArticleTrackerProps) {
  const { data: session } = authClient.useSession()

  useEffect(() => {
    // Get user ID - prefer authenticated user, fallback to localStorage
    const userId = session?.user?.id || getUserId()
    if (!userId) return

    // Track this article view
    fetch('/api/memory/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        type: 'article_view',
        data: {
          id: article.id,
          title: article.title,
          slug: article.slug,
          categories: article.categories,
        },
      }),
    }).catch(err => {
      // Silent fail - tracking shouldn't break the page
      console.debug('[ArticleTracker] Failed to track view:', err)
    })
  }, [article.id, session?.user?.id])

  // This component renders nothing
  return null
}
