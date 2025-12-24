import type { Metadata } from "next"
import "./globals.css"
import { authClient } from '@/lib/auth/client'
import { NeonAuthUIProvider } from '@neondatabase/neon-js/auth/react/ui'
import { BetaBadge } from '@/components/BetaBadge'
import { ConsentBanner } from '@/components/ConsentBanner'
import { LogoBadge } from '@/components/LogoBadge'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
  title: "Lost London | Discover London's Hidden Stories",
  description: "Explore Vic Keegan's Lost London - 372 articles about London's hidden history, secret gems, and fascinating stories. Interactive maps, walking routes, and more.",
  keywords: ["London history", "hidden London", "London walks", "London guide", "Vic Keegan", "Lost London"],
  authors: [{ name: "Vic Keegan" }],
  icons: {
    icon: "/Lost London Logo.png",
    apple: "/Lost London Logo.png",
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    title: "Lost London | Discover London's Hidden Stories",
    description: "Explore Vic Keegan's Lost London - interactive maps, walking routes, and fascinating stories.",
    siteName: "Lost London",
    images: ["/Lost London Logo.png"],
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
          <LogoBadge />
          <BetaBadge />
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <ConsentBanner />
        </NeonAuthUIProvider>
      </body>
    </html>
  )
}
