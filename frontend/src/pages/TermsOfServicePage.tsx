import { Link } from 'react-router-dom';

const DISPLAY: React.CSSProperties = { fontFamily: "'Syne', system-ui, sans-serif", fontWeight: 800 };
const MONO: React.CSSProperties    = { fontFamily: "'IBM Plex Mono', 'Courier New', monospace" };

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors mb-12"
          style={MONO}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to home
        </Link>

        <h1 className="text-4xl text-slate-900 dark:text-white mb-2" style={DISPLAY}>Terms of Service</h1>
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-12" style={MONO}>Last updated: March 2026</p>

        <div className="space-y-10 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-lg text-slate-900 dark:text-white font-semibold mb-3" style={DISPLAY}>1. Acceptance of Terms</h2>
            <p className="text-slate-600 dark:text-slate-400">
              By accessing or using Linkpouch ("the Service"), you agree to be bound by these Terms of Service.
              If you do not agree, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-slate-900 dark:text-white font-semibold mb-3" style={DISPLAY}>2. Use of the Service</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-3">
              Linkpouch lets you create anonymous link collections ("pouches") accessible via a unique signed URL.
              No account is required to create or use a pouch. You may optionally sign in with a supported OAuth
              provider (GitHub, Google, X/Twitter, or Discord) to claim ownership of a pouch, enable privacy
              controls, and access additional features.
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              You are responsible for keeping your pouch URL and access key secure. Anyone with a signed URL
              can access the pouch unless you set it to private after claiming it.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-slate-900 dark:text-white font-semibold mb-3" style={DISPLAY}>3. Accounts and OAuth Login</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-3">
              When you sign in via an OAuth provider, we collect the profile information that provider shares with
              us — typically your display name, email address (if the provider supplies it), avatar image URL, and
              a provider-specific user identifier. This data is used solely to identify your account within the
              Service. See our Privacy Policy for full details.
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              You are responsible for maintaining the security of your OAuth session. Signing out or revoking app
              access from your OAuth provider ends your authenticated session on this Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-slate-900 dark:text-white font-semibold mb-3" style={DISPLAY}>4. AI Summary Feature</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-3">
              Claimed pouches may optionally enable AI-generated summaries for saved links. This feature sends
              extracted page content (up to 80,000 characters) to an AI provider to generate a summary.
            </p>
            <p className="text-slate-600 dark:text-slate-400 mb-3">
              You may use a free included tier (powered by OpenRouter) or bring your own API key from a supported
              provider (OpenAI, Anthropic, OpenRouter, or OpenCode). If you provide an API key, it is stored in
              our database in AES-256-GCM encrypted form. We do not use your key for any purpose other than
              generating summaries within your pouch.
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              When AI summaries are enabled, page content from the links you save is transmitted to the configured
              AI provider. You are responsible for ensuring that doing so complies with the terms of that provider
              and the terms of the websites you save. By enabling this feature, you consent to this data transfer.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-slate-900 dark:text-white font-semibold mb-3" style={DISPLAY}>5. Content and Prohibited Uses</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-3">
              You are solely responsible for the links and content you store. We do not proactively moderate
              content but reserve the right to remove any content that violates these Terms or applicable law.
            </p>
            <p className="text-slate-600 dark:text-slate-400 mb-3">You agree not to use the Service to:</p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-600 dark:text-slate-400 pl-2">
              <li>Store or share links to illegal content or content that violates third-party rights</li>
              <li>Engage in spam, phishing, or any deceptive activity</li>
              <li>Attempt to disrupt, overload, or compromise the Service's infrastructure</li>
              <li>Circumvent any security or access-control mechanisms</li>
              <li>Use automated tools to bulk-create or scrape pouches</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg text-slate-900 dark:text-white font-semibold mb-3" style={DISPLAY}>6. Disclaimer of Warranties</h2>
            <p className="text-slate-600 dark:text-slate-400">
              The Service is provided "as is" without warranties of any kind. We do not guarantee availability,
              uptime, or indefinite data retention. We may suspend or terminate the Service at any time without
              notice. You are encouraged to keep backups of any links you consider important.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-slate-900 dark:text-white font-semibold mb-3" style={DISPLAY}>7. Limitation of Liability</h2>
            <p className="text-slate-600 dark:text-slate-400">
              To the fullest extent permitted by law, Linkpouch and its operators shall not be liable for any
              indirect, incidental, or consequential damages arising from your use of the Service, including
              loss of data or unauthorised access to your pouch.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-slate-900 dark:text-white font-semibold mb-3" style={DISPLAY}>8. Changes to These Terms</h2>
            <p className="text-slate-600 dark:text-slate-400">
              We may update these Terms from time to time. The date at the top of this page reflects the latest
              revision. Continued use of the Service after changes are posted constitutes acceptance of the
              revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-slate-900 dark:text-white font-semibold mb-3" style={DISPLAY}>9. Contact</h2>
            <p className="text-slate-600 dark:text-slate-400">
              For questions about these Terms, contact us at{' '}
              <a href="https://x.com/jamezrin" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors">
                @jamezrin
              </a>{' '}
              on X.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
