'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface PendingInterest {
  id: number
  topic: string
  article_id: number | null
  article_title: string | null
  article_slug: string | null
  status: 'pending' | 'confirmed' | 'rejected'
  created_at: string
}

interface InterestConfirmationProps {
  onUpdate?: () => void
}

/**
 * Human-in-the-loop Interest Confirmation Component
 *
 * Shows pending topics extracted from conversations and allows
 * users to confirm or reject them before they become validated interests.
 *
 * Only confirmed interests are stored in Zep for personalization.
 */
export function InterestConfirmation({ onUpdate }: InterestConfirmationProps) {
  const [pendingInterests, setPendingInterests] = useState<PendingInterest[]>([])
  const [confirmedCount, setConfirmedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<number | null>(null)

  useEffect(() => {
    fetchInterests()
  }, [])

  const fetchInterests = async () => {
    try {
      const res = await fetch('/api/interests?status=pending')
      const data = await res.json()

      if (!data.error) {
        setPendingInterests(data.interests || [])
        setConfirmedCount(data.counts?.confirmed || 0)
      }
    } catch (error) {
      console.error('Failed to fetch interests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (interestId: number, action: 'confirm' | 'reject') => {
    setProcessing(interestId)

    try {
      const res = await fetch('/api/interests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interestId, action }),
      })

      if (res.ok) {
        // Remove from pending list
        setPendingInterests(prev => prev.filter(i => i.id !== interestId))
        if (action === 'confirm') {
          setConfirmedCount(prev => prev + 1)
        }
        onUpdate?.()
      }
    } catch (error) {
      console.error('Failed to update interest:', error)
    } finally {
      setProcessing(null)
    }
  }

  const handleConfirmAll = async () => {
    for (const interest of pendingInterests) {
      await handleAction(interest.id, 'confirm')
    }
  }

  if (loading) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-amber-200 rounded w-48 mb-4" />
        <div className="h-4 bg-amber-100 rounded w-64" />
      </div>
    )
  }

  if (pendingInterests.length === 0) {
    return null // Don't show if no pending interests
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-serif font-bold text-gray-900 text-lg flex items-center gap-2">
            <span>✋</span> Confirm Your Interests
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            VIC noticed you might be interested in these topics. Confirm to personalize your experience.
          </p>
        </div>
        {pendingInterests.length > 1 && (
          <button
            onClick={handleConfirmAll}
            className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors"
          >
            Confirm All
          </button>
        )}
      </div>

      <div className="space-y-3">
        {pendingInterests.map(interest => (
          <div
            key={interest.id}
            className="bg-white rounded-lg p-4 border border-amber-100 flex items-center justify-between gap-4"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-amber-600">📍</span>
                <span className="font-medium text-gray-900">{interest.topic}</span>
              </div>
              {interest.article_title && interest.article_slug && (
                <Link
                  href={`/article/${interest.article_slug}`}
                  className="text-sm text-slate-600 hover:text-red-700 flex items-center gap-1"
                >
                  <span>📄</span>
                  <span className="underline">{interest.article_title}</span>
                </Link>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleAction(interest.id, 'confirm')}
                disabled={processing === interest.id}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {processing === interest.id ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <>
                    <span>✓</span>
                    <span>Yes</span>
                  </>
                )}
              </button>
              <button
                onClick={() => handleAction(interest.id, 'reject')}
                disabled={processing === interest.id}
                className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <span>✗</span>
                <span>Not really</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {confirmedCount > 0 && (
        <div className="mt-4 pt-4 border-t border-amber-200 flex items-center justify-between text-sm">
          <span className="text-gray-600">
            <span className="text-green-600 font-medium">{confirmedCount}</span> interests confirmed
          </span>
          <span className="text-gray-500">
            VIC will remember these for personalized recommendations
          </span>
        </div>
      )}
    </div>
  )
}

export default InterestConfirmation
