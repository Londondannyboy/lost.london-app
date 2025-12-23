'use client'

import { UserButton as NeonUserButton, SignedIn, SignedOut } from '@neondatabase/neon-js/auth/react'
import Link from 'next/link'

export function UserButton() {
  return (
    <>
      <SignedIn>
        <NeonUserButton size="icon" />
      </SignedIn>
      <SignedOut>
        <Link
          href="/auth/sign-in"
          className="text-sm text-gray-600 hover:text-black transition-colors"
        >
          Sign in
        </Link>
      </SignedOut>
    </>
  )
}
