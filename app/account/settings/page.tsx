'use client'

import { AccountView } from '@neondatabase/neon-js/auth/react'
import Link from 'next/link'

export default function AccountSettingsPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="font-bold text-xl tracking-tight">
            lost.london
          </Link>
          <Link href="/" className="text-sm text-gray-600 hover:text-black">
            Back to home
          </Link>
        </div>
      </header>

      {/* Account Settings */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-8">Account Settings</h1>
        <AccountView />
      </main>
    </div>
  )
}
