import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy & Terms | Lost London',
  description: 'Privacy policy and terms of service for Lost London beta.',
}

export default function PrivacyPage() {
  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Beta Warning */}
        <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-6 mb-12">
          <div className="flex items-start gap-3">
            <span className="text-2xl">&#9888;</span>
            <div>
              <h2 className="font-bold text-amber-800 mb-2">Beta Release Notice</h2>
              <p className="text-amber-700">
                <strong>This is a beta product for demonstration purposes only.</strong> We periodically clear user data during development. By signing up, you acknowledge that your account and conversation history may be deleted at any time without notice. Please do not rely on this service for important information.
              </p>
            </div>
          </div>
        </div>

        <h1 className="text-4xl font-bold mb-8">Privacy Policy & Terms of Service</h1>

        <p className="text-gray-500 mb-8">Last updated: January 2025</p>

        <div className="prose prose-gray max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
            <p className="text-gray-600 mb-4">
              Welcome to Lost London ("we", "our", "us"). This Privacy Policy explains how we collect, use, and protect your personal information when you use our AI-powered London history guide service.
            </p>
            <p className="text-gray-600">
              Lost London is operated by Fractional.quest as a demonstration project. By using our service, you agree to the terms outlined in this policy.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">2. Beta Service Disclaimer</h2>
            <p className="text-gray-600 mb-4">
              <strong>This service is provided on an "as-is" basis for demonstration and testing purposes.</strong>
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>User accounts and data may be deleted at any time without prior notice</li>
              <li>Service availability is not guaranteed</li>
              <li>Features may change or be removed without warning</li>
              <li>We make no warranties about the accuracy of historical information provided by our AI</li>
              <li>Do not use this service as your sole source of historical research</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">3. Information We Collect</h2>
            <h3 className="text-lg font-semibold mb-3">Account Information</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Email address (for account creation)</li>
              <li>Display name (optional)</li>
              <li>Profile picture (if provided via OAuth)</li>
            </ul>

            <h3 className="text-lg font-semibold mb-3">Usage Data</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
              <li>Voice conversation transcripts with VIC</li>
              <li>Topics and articles you explore</li>
              <li>Session information and preferences</li>
            </ul>

            <h3 className="text-lg font-semibold mb-3">Technical Data</h3>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Browser type and device information</li>
              <li>IP address</li>
              <li>Cookies for session management</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">4. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>To provide and improve the Lost London service</li>
              <li>To personalize your experience and remember your preferences</li>
              <li>To enable VIC to recall your conversation history</li>
              <li>To analyze usage patterns and improve our AI responses</li>
              <li>To communicate service updates (if applicable)</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">5. Third-Party Services</h2>
            <p className="text-gray-600 mb-4">We use the following third-party services:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Hume AI</strong> — Voice conversation processing</li>
              <li><strong>Neon</strong> — Database hosting</li>
              <li><strong>Vercel</strong> — Application hosting</li>
              <li><strong>Google/GitHub</strong> — OAuth authentication (optional)</li>
            </ul>
            <p className="text-gray-600 mt-4">
              Each third-party service has its own privacy policy governing their use of data.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">6. Data Retention</h2>
            <p className="text-gray-600 mb-4">
              As this is a beta service, we reserve the right to delete all user data at any time. During normal operation:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Account data is retained until you delete your account or we clear the database</li>
              <li>Conversation logs may be retained for service improvement</li>
              <li>You may request deletion of your data by contacting us</li>
            </ul>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">7. Cookies</h2>
            <p className="text-gray-600 mb-4">We use cookies for:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Essential cookies</strong> — Required for authentication and session management</li>
              <li><strong>Preference cookies</strong> — To remember your settings and choices</li>
            </ul>
            <p className="text-gray-600 mt-4">
              You can decline non-essential cookies, though this may affect your experience.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">8. Your Rights (GDPR)</h2>
            <p className="text-gray-600 mb-4">If you are in the EU/UK, you have the right to:</p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Access your personal data</li>
              <li>Rectify inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Object to processing</li>
              <li>Data portability</li>
            </ul>
            <p className="text-gray-600 mt-4">
              To exercise these rights, please contact us at the details below.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">9. Content & Intellectual Property</h2>
            <p className="text-gray-600 mb-4">
              The articles and historical content on Lost London are written by Vic Keegan and originally published on londonmylondon.co.uk and onlondon.co.uk. All rights to the original content remain with the author.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">10. Contact</h2>
            <p className="text-gray-600 mb-4">
              For privacy inquiries, GDPR requests, or questions about the service:
            </p>
            <p className="text-gray-600 mb-4">
              <strong>Email:</strong>{' '}
              <a href="mailto:hello@fractional.quest" className="text-black underline hover:no-underline">hello@fractional.quest</a>
            </p>
            <p className="text-gray-600 mb-4">
              <strong>GDPR & Data Requests:</strong>{' '}
              <a href="mailto:dan@fractional.quest" className="text-black underline hover:no-underline">dan@fractional.quest</a>
            </p>
            <p className="text-gray-600">
              <strong>Website:</strong>{' '}
              <a href="https://fractional.quest" className="text-black underline hover:no-underline" target="_blank" rel="noopener noreferrer">fractional.quest</a>
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">11. Changes to This Policy</h2>
            <p className="text-gray-600">
              We may update this policy from time to time. Continued use of the service after changes constitutes acceptance of the updated policy.
            </p>
          </section>
        </div>

        {/* Back Link */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <a href="/" className="text-gray-500 hover:text-black transition-colors">
            ← Back to Lost London
          </a>
        </div>
      </div>
    </div>
  )
}
