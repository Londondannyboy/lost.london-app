'use client'

import { useEffect, useState } from 'react'
import { authClient } from '@/lib/auth/client'
import Link from 'next/link'

interface ValidationLog {
  id: number
  created_at: string
  user_query: string
  articles_found: number
  article_titles: string[]
  validation_passed: boolean
  confidence_score: number
  response_text?: string
}

interface Amendment {
  id: number
  amendment_type: string
  original_text: string
  amended_text: string
  article_title: string
  reason: string
  created_at: string
  status: string
  source: string
  applied_to_cache: boolean
}

export default function AdminPage() {
  const { data: session, isPending } = authClient.useSession()
  const [logs, setLogs] = useState<ValidationLog[]>([])
  const [amendments, setAmendments] = useState<Amendment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<ValidationLog | null>(null)
  const [correctionText, setCorrectionText] = useState('')
  const [correctionReason, setCorrectionReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState<number | null>(null)

  const isAdmin = session?.user?.role === 'admin'

  // Filter voice corrections that are pending
  const pendingVoiceCorrections = amendments.filter(
    a => a.source === 'voice_feedback' && a.status === 'pending'
  )

  const handleApproveCorrection = async (amendment: Amendment) => {
    setApproving(amendment.id)
    try {
      const res = await fetch(`/api/admin/amendments/${amendment.id}/approve`, {
        method: 'POST',
      })

      if (res.ok) {
        // Update local state
        setAmendments(prev => prev.map(a =>
          a.id === amendment.id ? { ...a, status: 'approved', applied_to_cache: true } : a
        ))
        alert('Correction approved and applied to cache!')
      } else {
        const data = await res.json()
        alert(`Failed to approve: ${data.error}`)
      }
    } catch (e) {
      console.error('Failed to approve correction:', e)
      alert('Failed to approve correction')
    } finally {
      setApproving(null)
    }
  }

  const handleRejectCorrection = async (amendment: Amendment) => {
    setApproving(amendment.id)
    try {
      const res = await fetch(`/api/admin/amendments/${amendment.id}/reject`, {
        method: 'POST',
      })

      if (res.ok) {
        setAmendments(prev => prev.map(a =>
          a.id === amendment.id ? { ...a, status: 'rejected' } : a
        ))
        alert('Correction rejected')
      }
    } catch (e) {
      console.error('Failed to reject correction:', e)
    } finally {
      setApproving(null)
    }
  }

  useEffect(() => {
    if (!isAdmin) return

    async function fetchData() {
      try {
        const [logsRes, amendsRes] = await Promise.all([
          fetch('/api/admin/responses'),
          fetch('/api/admin/amendments')
        ])

        if (logsRes.ok) {
          const data = await logsRes.json()
          setLogs(data.logs || [])
        }
        if (amendsRes.ok) {
          const data = await amendsRes.json()
          setAmendments(data.amendments || [])
        }
      } catch (e) {
        console.error('Failed to fetch admin data:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isAdmin])

  const handleSaveCorrection = async () => {
    if (!selectedLog || !correctionText.trim()) return

    setSaving(true)
    try {
      const res = await fetch('/api/admin/amendments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amendment_type: 'correction',
          original_text: selectedLog.response_text || selectedLog.user_query,
          amended_text: correctionText,
          article_title: selectedLog.article_titles?.[0] || 'Unknown',
          reason: correctionReason,
          user_query: selectedLog.user_query,
        })
      })

      if (res.ok) {
        const data = await res.json()
        setAmendments(prev => [data.amendment, ...prev])
        setSelectedLog(null)
        setCorrectionText('')
        setCorrectionReason('')
        alert('Correction saved!')
      }
    } catch (e) {
      console.error('Failed to save correction:', e)
      alert('Failed to save correction')
    } finally {
      setSaving(false)
    }
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-black rounded-full" />
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Sign in required</h1>
          <Link href="/auth/sign-in" className="text-blue-600 underline">Sign in</Link>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have admin privileges.</p>
          <Link href="/" className="text-blue-600 underline mt-4 block">Back to home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-stone-50 text-gray-900">
      <main className="max-w-6xl mx-auto p-6">
        {/* Admin Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">VIC Admin</h1>
          <p className="text-gray-500">Knowledge Base Management</p>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm text-gray-500">Recent Responses</h3>
            <p className="text-2xl font-bold">{logs.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm text-gray-500">Corrections Made</h3>
            <p className="text-2xl font-bold">{amendments.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm text-gray-500">Validation Rate</h3>
            <p className="text-2xl font-bold">
              {logs.length > 0
                ? Math.round((logs.filter(l => l.validation_passed).length / logs.length) * 100)
                : 0}%
            </p>
          </div>
        </div>

        {/* Pending Voice Corrections */}
        {pendingVoiceCorrections.length > 0 && (
          <div className="mb-8 bg-amber-50 border border-amber-200 rounded-lg shadow">
            <div className="p-4 border-b border-amber-200">
              <h2 className="font-bold text-amber-800">Pending Voice Corrections</h2>
              <p className="text-sm text-amber-600">Vic spoke these corrections - review and approve to update the knowledge base</p>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {pendingVoiceCorrections.map(correction => (
                <div key={correction.id} className="p-4 border-b border-amber-100 last:border-b-0">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{correction.amended_text}</p>
                      <p className="text-xs text-gray-500 mt-1">{correction.reason}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(correction.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleApproveCorrection(correction)}
                        disabled={approving === correction.id}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {approving === correction.id ? '...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleRejectCorrection(correction)}
                        disabled={approving === correction.id}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          {/* Recent Responses */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="font-bold">Recent VIC Responses</h2>
              <p className="text-sm text-gray-500">Click to review and correct</p>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {loading ? (
                <p className="p-4 text-gray-500">Loading...</p>
              ) : logs.length === 0 ? (
                <p className="p-4 text-gray-500">No recent responses</p>
              ) : (
                logs.map(log => (
                  <button
                    key={log.id}
                    onClick={() => {
                      setSelectedLog(log)
                      setCorrectionText(log.response_text || '')
                    }}
                    className={`w-full text-left p-4 border-b hover:bg-gray-50 ${
                      selectedLog?.id === log.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-sm">{log.user_query}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        log.validation_passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {log.validation_passed ? 'Valid' : 'Check'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {log.articles_found} articles | {Math.round(log.confidence_score * 100)}% confidence
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Correction Panel */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="font-bold">Make Correction</h2>
              <p className="text-sm text-gray-500">Edit VIC's response</p>
            </div>
            <div className="p-4">
              {selectedLog ? (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Original Query</label>
                    <p className="text-sm bg-gray-100 p-2 rounded">{selectedLog.user_query}</p>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Corrected Response</label>
                    <textarea
                      value={correctionText}
                      onChange={(e) => setCorrectionText(e.target.value)}
                      className="w-full border rounded p-2 text-sm h-32"
                      placeholder="Enter the correct response..."
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Reason for Correction</label>
                    <input
                      type="text"
                      value={correctionReason}
                      onChange={(e) => setCorrectionReason(e.target.value)}
                      className="w-full border rounded p-2 text-sm"
                      placeholder="e.g., Wrong date, missing context..."
                    />
                  </div>

                  <button
                    onClick={handleSaveCorrection}
                    disabled={saving || !correctionText.trim()}
                    className="w-full bg-[#2a231a] text-white py-2 rounded hover:bg-[#3d3225] disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Correction'}
                  </button>
                </>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Select a response to review and correct
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Amendments */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="font-bold">Amendment History</h2>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {amendments.length === 0 ? (
              <p className="p-4 text-gray-500">No amendments yet</p>
            ) : (
              amendments.map(amend => (
                <div key={amend.id} className="p-4 border-b">
                  <div className="flex justify-between">
                    <span className="font-medium text-sm">{amend.article_title}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(amend.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{amend.reason}</p>
                  <p className="text-xs text-gray-400 mt-1">Type: {amend.amendment_type}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
