import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { stashApi } from '../services/api';

// ─── Static data ──────────────────────────────────────────────────────────────

const MOCK_LINKS: Array<{
  title: string;
  url: string;
  color: string;
  active?: boolean;
  dot: boolean;
}> = [
  { title: 'React Query — Async State Management', url: 'tanstack.com/query', color: '#6366f1', active: true, dot: true },
  { title: 'Radix UI — Accessible Primitives', url: 'radix-ui.com', color: '#8b5cf6', dot: true },
  { title: 'Framer Motion — Production Animation', url: 'framer.com/motion', color: '#10b981', dot: false },
  { title: 'Tailwind CSS v4 Release Notes', url: 'tailwindcss.com', color: '#06b6d4', dot: true },
  { title: 'shadcn/ui — Copy-paste Components', url: 'ui.shadcn.com', color: '#f59e0b', dot: false },
  { title: 'TypeScript Handbook', url: 'typescriptlang.org/docs', color: '#3b82f6', dot: true },
];

type FeatureColor = 'indigo' | 'violet' | 'emerald' | 'amber' | 'sky' | 'rose';

const FEATURE_COLOR_MAP: Record<FeatureColor, { bg: string; text: string }> = {
  indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-600'  },
  violet:  { bg: 'bg-violet-50',  text: 'text-violet-600'  },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-600'   },
  sky:     { bg: 'bg-sky-50',     text: 'text-sky-600'     },
  rose:    { bg: 'bg-rose-50',    text: 'text-rose-600'    },
};

const FEATURES: Array<{ color: FeatureColor; icon: React.ReactNode; title: string; desc: string }> = [
  {
    color: 'indigo',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Private by default',
    desc: 'Access controlled by cryptographically signed URLs. Nobody can guess or brute-force your link — not even us.',
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
    desc: 'Every link gets a visual snapshot automatically. Browse your collection like a gallery, not a wall of text.',
  },
  {
    color: 'emerald',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    title: 'Full-text search',
    desc: 'Search across titles, descriptions, and page content. Find any link instantly, even months after saving it.',
  },
  {
    color: 'amber',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    ),
    title: 'Drag to reorder',
    desc: 'Organize links by drag-and-drop. Multi-select and move entire groups at once with a single gesture.',
  },
  {
    color: 'sky',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Archive previews',
    desc: 'View pages via the Wayback Machine. See saved content even when the original goes offline.',
  },
  {
    color: 'rose',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Instant saving',
    desc: "Paste a URL and it's saved. Metadata and screenshots are captured in the background without blocking you.",
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Create a pouch',
    desc: "Give it a name. Your private pouch is created instantly with a unique signed URL — no account, no password.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    n: '02',
    title: 'Add your links',
    desc: 'Paste URLs into the sidebar. Screenshots and metadata are captured automatically in the background.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    n: '03',
    title: 'Search and explore',
    desc: "Full-text search, drag to reorder, archive previews — all from your secret URL. Bookmark it and you're done.",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
];

const FAQS = [
  {
    q: 'Do I need an account?',
    a: "No. Linkpouch is completely anonymous. You get a private URL — that URL is your entire account. Bookmark it and you're set.",
  },
  {
    q: 'How is my data kept private?',
    a: 'Your pouch URL contains a cryptographic signature (HMAC-SHA256). Anyone without that exact URL cannot access your data — including us.',
  },
  {
    q: 'What if I lose my pouch URL?',
    a: "Bookmark it immediately after creating your pouch. Without the URL, there's no recovery option — that's what makes it truly private.",
  },
  {
    q: 'What are auto screenshots?',
    a: 'When you save a link, Linkpouch automatically captures a screenshot of the page. View it as a thumbnail in the list or in full-screen.',
  },
];

const ROADMAP: Array<{ icon: React.ReactNode; title: string; desc: string }> = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Password-protected pouches',
    desc: 'Add an optional passphrase on top of the signed URL — for sharing with a specific audience without exposing access to everyone.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
    title: 'Bulk link import',
    desc: 'Paste a list of URLs or drop in a file to populate your pouch all at once — great for migrating from other bookmark managers.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Mobile-ready interface',
    desc: 'A fully responsive layout optimized for managing your collection from phones and tablets, without compromise.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    title: 'Adaptive link preview',
    desc: "Automatic fallback to archive.org when a direct preview can't load, with a one-click toggle between live and archived view.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Real-time processing status',
    desc: 'Color-coded indicators show which links are still gathering screenshots or metadata, and which ones ran into issues.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    title: 'Improved full-text search',
    desc: 'Better relevance ranking, smarter metadata indexing, and faster suggestions across your entire link collection.',
  },
];

// ─── App UI Mockup ────────────────────────────────────────────────────────────

function AppMockup() {
  return (
    <div
      className="rounded-2xl overflow-hidden mx-auto max-w-3xl"
      style={{
        background:
          'linear-gradient(145deg, rgba(99,102,241,0.35) 0%, rgba(15,23,42,0) 35%, rgba(139,92,246,0.18) 100%)',
        padding: 1,
        boxShadow:
          '0 50px 100px -20px rgba(0,0,0,0.85), 0 0 0 1px rgba(99,102,241,0.12), 0 0 60px -20px rgba(99,102,241,0.25)',
      }}
    >
      <div className="rounded-[calc(1rem-1px)] overflow-hidden bg-slate-950">
        {/* App header */}
        <div
          className="h-10 flex items-center px-4 gap-3"
          style={{ background: 'rgb(2,6,23)', borderBottom: '1px solid rgb(30,41,59)' }}
        >
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-5 h-5 bg-indigo-600 rounded-md flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <span className="text-[11px] font-semibold text-white tracking-tight">linkpouch</span>
          </div>
          <span className="text-[11px]" style={{ color: 'rgb(51,65,85)' }}>/</span>
          <span className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>dev-resources</span>
          <div className="flex-1 flex justify-center">
            <div
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 w-44"
              style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(51,65,85,0.6)' }}
            >
              <svg className="w-2.5 h-2.5" style={{ color: 'rgb(71,85,105)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-[9px]" style={{ color: 'rgb(71,85,105)' }}>Search links…</span>
            </div>
          </div>
        </div>

        {/* App body */}
        <div className="flex" style={{ height: 290 }}>
          {/* Sidebar */}
          <div
            className="flex-shrink-0 flex flex-col"
            style={{ width: 224, background: 'rgb(2,6,23)', borderRight: '1px solid rgb(30,41,59)' }}
          >
            {/* Add link bar */}
            <div className="flex gap-1.5 p-2.5" style={{ borderBottom: '1px solid rgb(30,41,59)' }}>
              <div
                className="flex-1 h-6 rounded-lg"
                style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(51,65,85,0.6)' }}
              />
              <div className="w-10 h-6 rounded-lg flex-shrink-0" style={{ background: 'rgb(79,70,229)' }} />
            </div>
            {/* Link items */}
            {MOCK_LINKS.map((link, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-2.5 py-1.5"
                style={{
                  borderBottom: '1px solid rgba(30,41,59,0.5)',
                  background: link.active ? 'rgba(99,102,241,0.12)' : 'transparent',
                  borderLeft: link.active ? '2px solid rgb(129,140,248)' : '2px solid transparent',
                }}
              >
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ background: link.color, opacity: 0.7 }}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[8.5px] leading-tight truncate"
                    style={{ color: link.active ? 'rgb(226,232,240)' : 'rgb(148,163,184)' }}
                  >
                    {link.title}
                  </div>
                  <div className="text-[7.5px] truncate mt-0.5" style={{ color: 'rgb(71,85,105)' }}>
                    {link.url}
                  </div>
                </div>
                {link.dot && (
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: 'rgb(16,185,129)' }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Preview pane */}
          <div className="flex-1 flex flex-col" style={{ background: 'rgb(248,250,252)' }}>
            {/* Link header */}
            <div
              className="px-4 py-3 bg-white flex gap-3"
              style={{ borderBottom: '1px solid rgb(226,232,240)' }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-[10.5px] font-semibold truncate mb-0.5" style={{ color: 'rgb(15,23,42)' }}>
                  React Query — Async State Management
                </div>
                <div className="text-[8px] mb-1.5" style={{ color: 'rgb(99,102,241)' }}>
                  tanstack.com/query/latest
                </div>
                <div className="text-[8px] leading-relaxed" style={{ color: 'rgb(100,116,139)' }}>
                  Powerful async state management for TS/JS and React. Fetch, cache, sync and update
                  server state effortlessly without touching global state.
                </div>
              </div>
              <div
                className="w-14 h-10 rounded-md flex-shrink-0"
                style={{
                  border: '1px solid rgb(226,232,240)',
                  background: 'linear-gradient(135deg, rgb(30,41,59), rgb(15,23,42))',
                }}
              />
            </div>
            {/* Archive loading */}
            <div
              className="flex-1 flex flex-col items-center justify-center"
              style={{ background: 'rgb(241,245,249)' }}
            >
              <div
                className="w-5 h-5 rounded-full border-2 animate-spin"
                style={{ borderColor: 'rgb(99,102,241)', borderTopColor: 'transparent' }}
              />
              <div className="text-[8px] mt-2" style={{ color: 'rgb(100,116,139)' }}>
                Loading archive…
              </div>
              <div className="text-[7px] mt-0.5" style={{ color: 'rgb(148,163,184)' }}>
                Powered by archive.org
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Create form (shared between hero and CTA) ────────────────────────────────

function CreateForm({
  value,
  onChange,
  onSubmit,
  isPending,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="flex gap-3">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Name your pouch..."
        className="flex-1 px-5 py-3.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-[15px]"
      />
      <button
        type="submit"
        disabled={isPending || !value.trim()}
        className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-[15px] whitespace-nowrap"
      >
        {isPending ? 'Creating…' : 'Create →'}
      </button>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const SERIF: React.CSSProperties = { fontFamily: "'DM Serif Display', Georgia, serif" };

export default function HomePage() {
  const [newStashName, setNewStashName] = useState('');
  const navigate = useNavigate();

  const createMutation = useMutation({
    mutationFn: (name: string) => stashApi.createStash({ name }),
    onSuccess: (response) => {
      const signedUrl = response.data.signedUrl;
      if (signedUrl) navigate(new URL(signedUrl).pathname);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to create pouch';
      alert(`Error: ${message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStashName.trim()) createMutation.mutate(newStashName.trim());
  };

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative bg-slate-950 overflow-hidden">
        {/* Gradient orbs */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 15% 50%, rgba(99,102,241,0.22) 0%, transparent 55%), ' +
              'radial-gradient(ellipse at 85% 15%, rgba(139,92,246,0.16) 0%, transparent 50%), ' +
              'radial-gradient(ellipse at 50% 90%, rgba(79,70,229,0.12) 0%, transparent 40%)',
          }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-0 text-center">
          {/* Badge */}
          <div
            className="animate-slide-up inline-flex items-center gap-2 bg-indigo-950/60 border border-indigo-700/40 rounded-full px-4 py-1.5 mb-10"
            style={{ animationDelay: '0ms' }}
          >
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
            <span className="text-sm text-indigo-300 font-medium">No account required</span>
          </div>

          {/* Headline */}
          <h1
            className="animate-slide-up text-6xl md:text-7xl font-bold text-white mb-6 leading-[1.08] tracking-tight"
            style={{ ...SERIF, animationDelay: '80ms' }}
          >
            Save links.{' '}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: 'linear-gradient(135deg, #818cf8, #a78bfa, #c084fc)' }}
            >
              Find them fast.
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className="animate-slide-up text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ animationDelay: '160ms' }}
          >
            Private link pouches with auto screenshots, full-text search, and archive previews.
            Just a secret URL — zero setup, zero accounts.
          </p>

          {/* CTA form */}
          <div
            className="animate-slide-up max-w-md mx-auto mb-5"
            style={{ animationDelay: '240ms' }}
          >
            <CreateForm
              value={newStashName}
              onChange={setNewStashName}
              onSubmit={handleSubmit}
              isPending={createMutation.isPending}
            />
          </div>

          {/* Trust indicators */}
          <div
            className="animate-slide-up flex items-center justify-center gap-6 mb-16 flex-wrap"
            style={{ animationDelay: '320ms' }}
          >
            {['Free, no limits', 'Zero sign-up', 'Private by design'].map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-slate-500 text-sm">
                <svg
                  className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </div>
            ))}
          </div>

          {/* App mockup */}
          <div
            className="animate-slide-up relative"
            style={{ animationDelay: '420ms' }}
          >
            <AppMockup />
            {/* Bottom fade into next section */}
            <div
              className="absolute inset-x-0 bottom-0 h-28 pointer-events-none"
              style={{ background: 'linear-gradient(to top, rgb(2,6,23), transparent)' }}
            />
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-3xl md:text-4xl font-bold text-slate-900 mb-3 tracking-tight"
              style={SERIF}
            >
              Everything you need
            </h2>
            <p className="text-slate-500 text-lg max-w-lg mx-auto">
              Powerful enough to actually use, simple enough to stay out of the way.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map((f) => {
              const { bg, text } = FEATURE_COLOR_MAP[f.color];
              return (
                <div
                  key={f.title}
                  className="p-6 rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all duration-200"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${bg} ${text}`}>
                    {f.icon}
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight"
              style={SERIF}
            >
              Up and running in seconds
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="flex flex-col bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    {step.icon}
                  </div>
                  <span className="text-2xl font-bold text-slate-200 font-mono">{step.n}</span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            {/* Left: intro */}
            <div>
              <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-6">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                <span className="text-xs text-indigo-600 font-medium uppercase tracking-wide">Privacy first</span>
              </div>
              <h2
                className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight"
                style={SERIF}
              >
                Questions answered
              </h2>
              <p className="text-slate-500 leading-relaxed">
                Linkpouch is built around privacy and simplicity. Your URL is your key —
                no account, no email, no password to forget.
              </p>
            </div>

            {/* Right: Q&A */}
            <div className="space-y-6">
              {FAQS.map((faq) => (
                <div key={faq.q} className="border-b border-slate-100 pb-6 last:border-0 last:pb-0">
                  <h3 className="font-semibold text-slate-900 mb-2">{faq.q}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Roadmap ───────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm text-emerald-700 font-medium">Actively developed</span>
            </div>
            <h2
              className="text-3xl md:text-4xl font-bold text-slate-900 mb-3 tracking-tight"
              style={SERIF}
            >
              More on the way
            </h2>
            <p className="text-slate-500 text-lg max-w-xl mx-auto">
              Linkpouch ships improvements regularly. Here's what's on the horizon.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ROADMAP.map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl border border-slate-100 p-5 flex gap-4 items-start hover:border-slate-200 hover:shadow-sm transition-all duration-200"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1 text-[15px]">{item.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-slate-400 text-sm mt-10">
            Have a suggestion?{' '}
            <a
              href="https://github.com/jamezrin"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-500 hover:text-indigo-600 font-medium transition-colors"
            >
              Open an issue on GitHub →
            </a>
          </p>
        </div>
      </section>

      {/* ── CTA + Footer ──────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-950 relative overflow-hidden text-center">
        {/* Gradient orb */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.22) 0%, transparent 60%)',
          }}
        />

        <div className="relative max-w-md mx-auto">
          <h2
            className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight"
            style={SERIF}
          >
            Ready to start?
          </h2>
          <p className="text-slate-500 mb-8">
            Create your first pouch in seconds. No sign-up, no credit card.
          </p>

          <div className="mb-4">
            <CreateForm
              value={newStashName}
              onChange={setNewStashName}
              onSubmit={handleSubmit}
              isPending={createMutation.isPending}
            />
          </div>
          <p className="text-slate-700 text-sm">Your pouch URL is the only thing you need to keep.</p>
        </div>

        {/* Footer */}
        <div className="relative mt-20 border-t border-slate-800/60 pt-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-5 h-5 bg-indigo-600 rounded-md flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-500">linkpouch</span>
          </div>
          <p className="text-slate-700 text-xs mb-5">Save links. Find them fast.</p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="https://x.com/jamezrin"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-slate-300 transition-colors"
              title="Follow on X"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.745l7.73-8.835L1.254 2.25H8.08l4.213 5.567z" />
              </svg>
            </a>
            <a
              href="https://github.com/jamezrin"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-slate-300 transition-colors"
              title="GitHub"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
