'use client'

import { AccountView } from '@neondatabase/neon-js/auth/react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { authClient } from '@/lib/auth/client'

export default function AccountSettingsPage() {
  const { data: session } = authClient.useSession()
  const [preferredName, setPreferredName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (session?.user) {
      fetch('/api/user/preferred-name')
        .then(res => res.json())
        .then(data => {
          if (data.preferred_name) {
            setPreferredName(data.preferred_name)
          } else if (session.user.name) {
            // Pre-populate with first word of display name
            const firstName = session.user.name.split(' ')[0]
            // Only use if it looks like a name (not email)
            if (firstName && !firstName.includes('@') && firstName.length > 1) {
              setPreferredName(firstName)
            }
          }
        })
        .catch(console.error)
    }
  }, [session])

  const handleSavePreferredName = async () => {
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/user/preferred-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferred_name: preferredName.trim() })
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    } catch (e) {
      console.error('Failed to save preferred name:', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-stone-50 text-gray-900">
      {/* Account Settings */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-8">Account Settings</h1>

        {/* VIC Preferred Name */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-2">What should VIC call you?</h2>
          <p className="text-sm text-gray-600 mb-4">
            Set your preferred name for conversations with VIC. Leave blank to use your account name.
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              placeholder="e.g., Vic, Dan, Your nickname..."
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSavePreferredName}
              disabled={saving}
              className="px-4 py-2 bg-[#2a231a] text-white rounded-lg hover:bg-[#3d3225] disabled:opacity-50 text-sm"
            >
              {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
            </button>
          </div>
        </div>

        {/* Neon Auth Account View */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Account Details</h2>
          <AccountView />
        </div>
      </main>
    </div>
  )
}
