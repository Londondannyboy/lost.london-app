import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Contact | Lost London',
  description: 'Get in touch with the Lost London team for support, feedback, or GDPR requests.',
}

export default function ContactPage() {
  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-8">Contact Us</h1>

        <p className="text-gray-600 mb-8 text-lg">
          Lost London is a demo project by{' '}
          <a href="https://fractional.quest" className="text-black underline hover:no-underline" target="_blank" rel="noopener noreferrer">
            Fractional.quest
          </a>
          . We'd love to hear from you.
        </p>

        <div className="space-y-8">
          {/* General Inquiries */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-3">General Inquiries</h2>
            <p className="text-gray-600 mb-4">
              Questions about the service, feedback, or partnership opportunities.
            </p>
            <a
              href="mailto:hello@fractional.quest"
              className="inline-flex items-center gap-2 text-black font-medium hover:underline"
            >
              <span>&#9993;</span>
              hello@fractional.quest
            </a>
          </div>

          {/* GDPR & Data */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-3">GDPR & Data Requests</h2>
            <p className="text-gray-600 mb-4">
              To request access to, correction of, or deletion of your personal data.
            </p>
            <a
              href="mailto:dan@fractional.quest"
              className="inline-flex items-center gap-2 text-black font-medium hover:underline"
            >
              <span>&#9993;</span>
              dan@fractional.quest
            </a>
          </div>

          {/* Technical Issues */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-3">Technical Issues</h2>
            <p className="text-gray-600 mb-4">
              Reporting bugs or technical problems with the service.
            </p>
            <a
              href="mailto:dan@fractional.quest?subject=Lost%20London%20Bug%20Report"
              className="inline-flex items-center gap-2 text-black font-medium hover:underline"
            >
              <span>&#9993;</span>
              dan@fractional.quest
            </a>
          </div>
        </div>

        {/* Beta Notice */}
        <div className="mt-12 p-6 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-800 text-sm">
            <strong>Note:</strong> Lost London is currently in beta. Response times may vary.
            Please see our{' '}
            <Link href="/privacy" className="underline hover:no-underline">
              Privacy Policy
            </Link>
            {' '}for information about how we handle your data.
          </p>
        </div>

        {/* Back Link */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <Link href="/" className="text-gray-500 hover:text-black transition-colors">
            &larr; Back to Lost London
          </Link>
        </div>
      </div>
    </div>
  )
}
