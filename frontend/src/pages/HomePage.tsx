import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { stashApi } from '../services/api';
import { Stash } from '../types';

export default function HomePage() {
  const [newStashName, setNewStashName] = useState('');
  const [createdStash, setCreatedStash] = useState<Stash | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const createMutation = useMutation({
    mutationFn: (name: string) => stashApi.createStash({ name }),
    onSuccess: (response) => {
      setCreatedStash(response.data);
      setShowModal(true);
      setNewStashName('');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to create stash';
      alert(`Error: ${message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStashName.trim()) {
      createMutation.mutate(newStashName.trim());
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-slate-950 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.18) 0%, transparent 55%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.12) 0%, transparent 50%)',
          }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative max-w-5xl mx-auto px-6 py-36 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-950/60 border border-indigo-700/40 rounded-full px-4 py-1.5 mb-10">
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
            <span className="text-sm text-indigo-300 font-medium">No account required</span>
          </div>

          <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-[1.05] tracking-tight">
            Save links.{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #818cf8, #a78bfa, #c084fc)' }}
            >
              Find them fast.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-xl mx-auto mb-12 leading-relaxed">
            Private link collections with auto screenshots and full-text search.
            Just a secure URL — zero setup, zero accounts.
          </p>

          <form onSubmit={handleSubmit} className="max-w-md mx-auto flex gap-3">
            <input
              type="text"
              value={newStashName}
              onChange={(e) => setNewStashName(e.target.value)}
              placeholder="Name your collection..."
              className="flex-1 px-5 py-3.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-[15px]"
            />
            <button
              type="submit"
              disabled={createMutation.isPending || !newStashName.trim()}
              className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-[15px] whitespace-nowrap"
            >
              {createMutation.isPending ? 'Creating…' : 'Create →'}
            </button>
          </form>
          <p className="text-slate-600 text-sm mt-4">Free, anonymous, no sign-up</p>
        </div>
      </section>

      {/* Features */}
      <section className="py-28 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Everything you need</h2>
            <p className="text-slate-500 text-lg">Powerful, without the complexity</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                color: 'indigo',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ),
                title: 'Private by default',
                desc: 'Access controlled by cryptographically signed URLs. Share intentionally, not accidentally.',
              },
              {
                color: 'violet',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
                title: 'Auto screenshots',
                desc: 'Every link gets a visual snapshot. Browse your collection like a gallery.',
              },
              {
                color: 'emerald',
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                ),
                title: 'Full-text search',
                desc: 'Search through titles, descriptions, and page content. Find anything instantly.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-200"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                    f.color === 'indigo'
                      ? 'bg-indigo-50 text-indigo-600'
                      : f.color === 'violet'
                      ? 'bg-violet-50 text-violet-600'
                      : 'bg-emerald-50 text-emerald-600'
                  }`}
                >
                  {f.icon}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-28 px-6 bg-slate-50">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900">Up and running in seconds</h2>
          </div>

          <div className="space-y-4">
            {[
              {
                n: '01',
                title: 'Create a collection',
                desc: 'Give it a name. Your stash is created instantly with a unique secret key.',
              },
              {
                n: '02',
                title: 'Add your links',
                desc: 'Paste URLs into the sidebar. Screenshots and metadata are captured automatically.',
              },
              {
                n: '03',
                title: 'Search and organize',
                desc: 'Full-text search, drag to reorder, and access everything from your secure URL.',
              },
            ].map((item) => (
              <div key={item.n} className="flex gap-5 items-start bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="text-2xl font-bold text-slate-200 font-mono w-10 flex-shrink-0 leading-none pt-0.5">
                  {item.n}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-6 bg-slate-950 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Ready to start?</h2>
        <p className="text-slate-500 mb-8">Create your first collection above — it takes 5 seconds.</p>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors"
        >
          Get started →
        </button>
      </section>

      {/* Success Modal */}
      {showModal && createdStash && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">Collection created!</h3>
              <p className="text-slate-500 text-sm">
                Save this URL — it's the only way to access{' '}
                <strong className="text-slate-700">"{createdStash.name}"</strong>
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-5 border border-slate-200">
              <code className="text-xs text-slate-600 break-all leading-relaxed block">
                {createdStash.signedUrl}
              </code>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => copyToClipboard(createdStash.signedUrl!)}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {copied ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy URL
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setCreatedStash(null);
                  setCopied(false);
                }}
                className="px-4 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors text-sm"
              >
                Another
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
