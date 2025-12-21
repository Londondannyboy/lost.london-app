import type { Metadata } from "next"
import "./globals.css"
import { authClient } from '@/lib/auth/client'
import { NeonAuthUIProvider } from '@neondatabase/neon-js/auth/react/ui'

export const metadata: Metadata = {
  title: "Lost London | Discover London's Hidden Stories",
  description: "Explore Vic Keegan's Lost London - 372 articles about London's hidden history, secret gems, and fascinating stories. Interactive maps, walking routes, and more.",
  keywords: ["London history", "hidden London", "London walks", "London guide", "Vic Keegan", "Lost London"],
  authors: [{ name: "Vic Keegan" }],
  openGraph: {
    type: "website",
    locale: "en_GB",
    title: "Lost London | Discover London's Hidden Stories",
    description: "Explore Vic Keegan's Lost London - interactive maps, walking routes, and fascinating stories.",
    siteName: "Lost London",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen flex flex-col bg-stone-50 text-gray-900" suppressHydrationWarning>
        <NeonAuthUIProvider
          authClient={authClient}
          redirectTo="/"
          social={{ providers: ['google', 'github'] }}
        >
          {children}
        </NeonAuthUIProvider>
      </body>
    </html>
  )
}
