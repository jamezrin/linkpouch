import { Link } from 'react-router-dom';

const DISPLAY: React.CSSProperties = { fontFamily: "'Syne', system-ui, sans-serif", fontWeight: 800 };
const MONO: React.CSSProperties    = { fontFamily: "'IBM Plex Mono', 'Courier New', monospace" };

export default function PrivacyPolicyPage() {
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

        <h1 className="text-4xl text-slate-900 dark:text-white mb-2" style={DISPLAY}>Privacy Policy</h1>
        <p className="text-sm text-slate-400 dark:text-slate-500 mb-12" style={MONO}>Last updated: March 2026</p>

        <div className="space-y-10 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-lg text-slate-900 dark:text-white font-semibold mb-3" style={DISPLAY}>1. Overview</h2>
            <p className="text-slate-600 dark:text-slate-400">
              Linkpouch is designed to be privacy-friendly. Creating and using a pouch requires no account and no
              personally identifiable information. This policy explains what data we collect, why, and how it is
              handled — both for anonymous users and for users who choose to sign in.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-slate-900 dark:text-white font-semibold mb-3" style={DISPLAY}>2. Anonymous Use</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-3">
              When you create or use a pouch without signing in, we store:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-600 dark:text-slate-400 pl-2">
              <li><strong className="text-slate-700 dark:text-slate-300">Pouch data</strong> — name, settings, and the HMAC signing key</li>
              <li><strong className="text-slate-700 dark:text-slate-300">Link data</strong> — URLs you save, along with automatically extracted titles, descriptions, favicons, page text, and screenshots</li>
              <li><strong className="text-slate-700 dark:text-slate-300">Folder structure</strong> — folder names and organisation you create within a pouch</li>
              <li><strong className="text-slate-700 dark:text-slate-300">Server logs</strong> — IP addresses and request timestamps, retained briefly for security and diagnostics</li>
            </ul>
            <p className="text-slate-600 dark:text-slate-400 mt-3">
              No name, email, or account credentials are collected in anonymous mode.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-slate-900 dark:text-white font-semibold mb-3" style={DISPLAY}>3. Account Data (OAuth Login)</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-3">
              You may sign in using GitHub, Google, X (Twitter), or Discord. When you do, we receive and store
              the profile information that provider shares with us:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-600 dark:text-slate-400 pl-2">
              <li><strong className="text-slate-700 dark:text-slate-300">Display name</strong> — your username or name from the provider</li>
              <li><strong className="text-slate-700 dark:text-slate-300">Email address</strong> — if the provider supplies it (X/Twitter does not)</li>
              <li><strong className="text-slate-700 dark:text-slate-300">Avatar URL</strong> — a link to your profile picture on the provider's servers</li>
              <li><strong className="text-slate-700 dark:text-slate-300">Provider user ID</strong> — the unique identifier assigned to you by the provider</li>
            </ul>
            <p className="text-slate-600 dark:text-slate-400 mt-3">
              This data is used solely to identify your account within Linkpouch (e.g. to associate claimed
              pouches with you). We do not share this data with third parties.
            </p>
            <p className="text-slate-600 dark:text-slate-400 mt-3">
              After a successful login, a JWT session token is issued and stored in your browser's{' '}
              <code className="text-indigo-600 dark:text-indigo-400 text-sm">sessionStorage</code>. Tokens
              expire after 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-slate-900 dark:text-white font-semibold mb-3" style={DISPLAY}>4. AI Summary Feature</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-3">
              If you enable AI-generated summaries on a claimed pouch, the following applies:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-600 dark:text-slate-400 pl-2">
              <li>
                <strong className="text-slate-700 dark:text-slate-300">Page content is sent to an AI provider</strong> — when a link is saved, extracted text (up to 80,000 characters) is transmitted to the configured AI provider to generate a summary. This transfer happens on our servers, not in your browser.
              </li>
              <li>
                <strong className="text-slate-700 dark:text-slate-300">Supported providers</strong> — OpenAI, Anthropic, OpenRouter, and OpenCode, plus a free included tier via OpenRouter using Linkpouch's own key.
              </li>
              <li>
                <strong className="text-slate-700 dark:text-slate-300">API key storage</strong> — if you provide your own API key, it is stored in our database encrypted with AES-256-GCM. The key is only decrypted at the moment it is needed to call the AI provider and is never exposed in API responses.
              </li>
              <li>
                <strong className="text-slate-700 dark:text-slate-300">Summary data stored</strong> — the generated summary text, the model name used, and token/timing statistics are stored per link.
              </li>
            </ul>
            <p className="text-slate-600 dark:text-slate-400 mt-3">
              By enabling AI summaries, you consent to page content from your saved links being sent to the
              configured AI provider. Please review that provider's privacy policy before enabling the feature.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-slate-900 dark:text-white font-semibold mb-3" style={DISPLAY}>5. How We Use Your Data</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-3">Data we collect is used only to:</p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-600 dark:text-slate-400 pl-2">
              <li>Operate and deliver the Service (store links, serve search results, generate previews)</li>
              <li>Identify your account and associate it with your claimed pouches</li>
              <li>Generate AI summaries when you have enabled that feature</li>
              <li>Detect and prevent abuse or security incidents</li>
            </ul>
            <p className="text-slate-600 dark:text-slate-400 mt-3">
              We do not sell, rent, share, or use your data for advertising or marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-slate-900 dark:text-white font-semibold mb-3" style={DISPLAY}>6. Browser Storage</h2>
            <p className="text-slate-600 dark:text-slate-400">
              Linkpouch uses browser storage for the following purposes:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-600 dark:text-slate-400 pl-2 mt-3">
              <li><code className="text-indigo-600 dark:text-indigo-400 text-sm">sessionStorage</code> — pouch access signatures and your session JWT</li>
              <li><code className="text-indigo-600 dark:text-indigo-400 text-sm">localStorage</code> — your recently accessed pouches and theme preference</li>
            </ul>
            <p className="text-slate-600 dark:text-slate-400 mt-3">
              No tracking cookies or third-party analytics scripts are used.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-slate-900 dark:text-white font-semibold mb-3" style={DISPLAY}>7. Third-Party Services</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-3">
              The following third-party services are involved in the operation of Linkpouch:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-600 dark:text-slate-400 pl-2">
              <li>
                <strong className="text-slate-700 dark:text-slate-300">OAuth providers (GitHub, Google, X/Twitter, Discord)</strong> — used for authentication only; governed by their respective privacy policies.
              </li>
              <li>
                <strong className="text-slate-700 dark:text-slate-300">AI providers (OpenAI, Anthropic, OpenRouter, OpenCode)</strong> — only contacted when AI summaries are enabled; page content from saved links is sent to them.
              </li>
              <li>
                <strong className="text-slate-700 dark:text-slate-300">Websites you save</strong> — our indexer service fetches each URL you save in order to extract metadata and capture a screenshot. This is a server-side request, not made from your browser.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg text-slate-900 dark:text-white font-semibold mb-3" style={DISPLAY}>8. Data Retention</h2>
            <p className="text-slate-600 dark:text-slate-400">
              Pouch data, link data, and account data are retained for as long as the Service is running. We do
              not currently offer a self-service account or pouch deletion mechanism. To request removal of your
              data, contact us with your pouch ID or account details.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-slate-900 dark:text-white font-semibold mb-3" style={DISPLAY}>9. Security</h2>
            <p className="text-slate-600 dark:text-slate-400">
              Access to pouches is controlled by HMAC-signed URLs — treat yours like a password. Account API keys
              are stored encrypted (AES-256-GCM). All traffic is served over HTTPS. We apply standard security
              headers and network-level access controls to protect the infrastructure.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-slate-900 dark:text-white font-semibold mb-3" style={DISPLAY}>10. Changes to This Policy</h2>
            <p className="text-slate-600 dark:text-slate-400">
              We may update this Privacy Policy from time to time. The date at the top of this page reflects the
              latest revision.
            </p>
          </section>

          <section>
            <h2 className="text-lg text-slate-900 dark:text-white font-semibold mb-3" style={DISPLAY}>11. Contact</h2>
            <p className="text-slate-600 dark:text-slate-400">
              For privacy-related questions or data removal requests, contact us at{' '}
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
