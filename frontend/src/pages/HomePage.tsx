import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { stashApi } from '../services/api';
import { useReveal } from '../hooks/useReveal';
import { useStashHistory } from '../hooks/useStashHistory';
import { StashHistoryEntry } from '../types';
import { PouchIcon } from '../components/PouchIcon';

// ─── Typography helpers ────────────────────────────────────────────────────
const DISPLAY: React.CSSProperties = { fontFamily: "'Syne', system-ui, sans-serif", fontWeight: 800 };
const MONO: React.CSSProperties    = { fontFamily: "'IBM Plex Mono', 'Courier New', monospace" };

// ─── Static data ───────────────────────────────────────────────────────────

const MOCK_LINKS: Array<{ title: string; url: string; active?: boolean; dot: 'green' | 'amber' | false }> = [
  { title: 'React Query — Async State Management', url: 'tanstack.com/query', active: true, dot: 'green' },
  { title: 'Radix UI — Accessible Primitives',     url: 'radix-ui.com',       dot: 'green' },
  { title: 'Framer Motion — Production Animation', url: 'framer.com/motion',  dot: 'amber' },
  { title: 'Tailwind CSS v4 Release Notes',         url: 'tailwindcss.com',    dot: 'green' },
  { title: 'shadcn/ui — Copy-paste Components',     url: 'ui.shadcn.com',      dot: false   },
  { title: 'TypeScript Handbook',                   url: 'typescriptlang.org', dot: 'green' },
];

const FEATURES: Array<{ icon: React.ReactNode; title: string; desc: string }> = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Private by default',
    desc: 'Your pouch URL is a cryptographic signature — unguessable and unforgeable. Add an optional passphrase on top for a second layer of access control, no account required.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Auto screenshots',
    desc: 'Every link gets a visual snapshot captured in the background. Color-coded status indicators show which links are still processing — updated live as they complete.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    title: 'Full-text search',
    desc: 'Search across titles, descriptions, and page content. Find any link instantly, even months after saving it.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    ),
    title: 'Drag to reorder',
    desc: 'Organize links by drag-and-drop, with multi-select to move entire groups at once. Prefer the keyboard? Arrow-key navigation, range selection, and keyboard-driven reordering are built in.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Adaptive preview',
    desc: 'Try the live page first, with automatic fallback to archive.org when a site blocks embedding — plus a one-click toggle between sources.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Instant saving',
    desc: "Paste a URL and it's saved. Need to add more at once? Drop a list of up to 100 — duplicates and invalid entries are skipped automatically, everything else queues in the background.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Mobile-ready',
    desc: 'A fully responsive layout that works on phones and tablets — switch between your link list and preview pane with a tap.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
      </svg>
    ),
    title: 'Zero tracking',
    desc: "No analytics, no behavioral tracking, no third-party scripts. Completely free with no limits on links or pouches. We don't know who you are — and we intend to keep it that way.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    title: 'Optional account linking',
    desc: 'Sign in with GitHub, Google, Discord, or X to attach pouches to an account — making them recoverable across devices without giving up anonymity.',
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
    desc: 'Paste a URL or bulk-import up to 100 at once. Screenshots and metadata are captured automatically in the background.',
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
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12l4-4m-4 4l4 4m10-4l-4-4m4 4l-4 4" />
      </svg>
    ),
    title: 'Multiple archival sources',
    desc: 'Choose from archive.org, archive.is, and more for the best chance of a working snapshot.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Collections & tags',
    desc: 'Organise links into nested collections or tag them freely — group research, projects, and reading lists.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
    title: 'AI smart tagging',
    desc: 'Save a URL and let AI extract metadata, pick a category, and write a short summary — automatically.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    title: 'Improved full-text search',
    desc: 'Better relevance ranking, smarter metadata indexing, and faster suggestions across your collection.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h3.172a2 2 0 011.414.586l1.828 1.828A2 2 0 0012.828 8H19a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      </svg>
    ),
    title: 'Nested folders',
    desc: 'Organize your collection into a hierarchy of folders, as deep as you need. Group research projects, reading lists, and references without collapsing everything into a single flat list.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
    title: 'Markdown export',
    desc: 'Export your entire pouch as clean Markdown — ready to drop into Obsidian, Notion, Bear, or any plain-text tool. Your links, your data, wherever you want it.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.401.604-.401.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.036 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
      </svg>
    ),
    title: 'Browser extension',
    desc: 'Save any page to your pouch with a single click from your browser toolbar — no copying URLs, no switching tabs. Choose which pouch to save to, add a note, and move on. Screenshots and metadata are queued in the background as always.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
      </svg>
    ),
    title: 'UI customization',
    desc: 'Prefer the sidebar on the right? Want a denser link list or a larger preview? Adjust the layout, link card style, and other preferences to make Linkpouch feel like yours. Settings are saved locally and persist across visits.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Advanced pouch management',
    desc: 'Fork a pouch to remix a shared collection as your own, duplicate one of your own pouches for a fresh starting point, or permanently delete a pouch when you no longer need it. Full control over your data, including a clear confirmation flow before anything irreversible happens.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    title: 'Stars & likes',
    desc: 'Star your most-used or most-important links and filter your list to show only favourites. A fast way to surface your go-to resources without having to scroll or search.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    title: 'Content change notifications',
    desc: 'Our indexer periodically re-visits your saved links and compares them to the previous snapshot. When a page changes significantly — updated content, a broken URL, or a site going offline — you get notified so you always know what\'s still current.',
  },
];

// ─── Relative time helper ──────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

// ─── Recent Pouches Panel ──────────────────────────────────────────────────
// Replaces AppMockup in the hero when history entries exist.

function RecentPouchesPanel({
  history,
  removeEntry,
  clearHistory,
}: {
  history: StashHistoryEntry[];
  removeEntry: (id: string) => void;
  clearHistory: () => void;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden mx-auto max-w-3xl"
      style={{
        background: 'linear-gradient(145deg, rgba(99,102,241,0.35) 0%, rgba(15,23,42,0) 35%, rgba(139,92,246,0.18) 100%)',
        padding: 1,
        boxShadow: '0 50px 100px -20px rgba(0,0,0,0.85), 0 0 0 1px rgba(99,102,241,0.15), 0 0 60px -20px rgba(99,102,241,0.3)',
      }}
    >
      {/* Inner height matches AppMockup (h-10 header + 290px body = 330px) */}
      <div className="rounded-[calc(1rem-1px)] overflow-hidden bg-slate-950" style={{ height: 330 }}>
        <div style={{ background: 'rgb(4,8,22)', height: '100%', display: 'flex', flexDirection: 'column' }}>

          {/* Sub-header */}
          <div
            className="flex items-center justify-between px-5 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid rgba(30,41,59,0.5)' }}
          >
            <div className="flex items-center gap-2">
              <span
                className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse flex-shrink-0"
                style={{ boxShadow: '0 0 5px rgba(129,140,248,0.7)' }}
              />
              <span className="text-[10px] font-medium tracking-[0.12em] uppercase text-slate-500" style={MONO}>
                recent pouches
              </span>
            </div>
            <button
              onClick={clearHistory}
              className="text-[10px] text-slate-700 hover:text-slate-400 transition-colors duration-150"
              style={MONO}
            >
              clear all
            </button>
          </div>

          {/* Entry list — scrollable, styled scrollbar */}
          <div className="overflow-y-auto flex-1 sidebar-scroll">
            {history.map((entry) => (
              <div
                key={entry.stashId}
                className="group relative flex items-center gap-3 py-3 transition-colors duration-100"
                style={{
                  borderBottom: '1px solid rgba(20,30,50,0.6)',
                  paddingLeft: 20,
                  paddingRight: 20,
                }}
              >
                {/* Hover: indigo wash */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
                  style={{ background: 'rgba(99,102,241,0.07)' }}
                />
                {/* Hover: left accent line */}
                <div
                  className="absolute left-0 inset-y-0 w-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  style={{ background: 'rgba(129,140,248,0.55)' }}
                />

                {/* Icon */}
                <div className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center bg-slate-800/50 group-hover:bg-indigo-500/25 transition-colors duration-150">
                  <PouchIcon className="w-2.5 h-2.5 text-slate-600 group-hover:text-indigo-300 transition-colors duration-150" strokeWidth={2.5} />
                </div>

                {/* Name */}
                <a
                  href={`/s/${entry.stashId}/${entry.signature}`}
                  className="flex-1 text-[12px] truncate min-w-0 text-slate-500 group-hover:text-slate-200 transition-colors duration-150"
                >
                  {entry.name}
                </a>

                {/* Timestamp */}
                <span
                  className="text-[10px] flex-shrink-0 tabular-nums"
                  style={{ color: 'rgb(51,65,85)', fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  {formatRelativeTime(entry.lastOpenedAt)}
                </span>

                {/* Remove */}
                <button
                  onClick={() => removeEntry(entry.stashId)}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded text-slate-700 hover:text-slate-400 transition-all duration-100"
                  title="Remove"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Footer count */}
          <div
            className="flex items-center justify-center py-2.5 flex-shrink-0"
            style={{ borderTop: '1px solid rgba(20,30,50,0.6)' }}
          >
            <span className="text-[9.5px] text-slate-700" style={MONO}>
              {history.length} pouch{history.length !== 1 ? 'es' : ''} saved locally
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App UI Mockup ─────────────────────────────────────────────────────────
// Shows the stash page: sidebar with links + a detail/preview pane.
// The preview pane shows a completed page load (no spinner).

function AppMockup() {
  return (
    <div
      className="rounded-2xl overflow-hidden mx-auto max-w-3xl"
      style={{
        background: 'linear-gradient(145deg, rgba(99,102,241,0.35) 0%, rgba(15,23,42,0) 35%, rgba(139,92,246,0.18) 100%)',
        padding: 1,
        boxShadow: '0 50px 100px -20px rgba(0,0,0,0.85), 0 0 0 1px rgba(99,102,241,0.15), 0 0 60px -20px rgba(99,102,241,0.3)',
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
              <PouchIcon className="w-3 h-3 text-white" strokeWidth={2.5} />
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
              <div className="w-10 h-6 rounded-lg flex-shrink-0 bg-indigo-600" />
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
                <div className="w-3 h-3 rounded-sm flex-shrink-0 bg-indigo-500" style={{ opacity: link.active ? 0.9 : 0.3 }} />
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[8.5px] leading-tight truncate"
                    style={{ color: link.active ? 'rgb(226,232,240)' : 'rgb(100,116,139)' }}
                  >
                    {link.title}
                  </div>
                  <div className="text-[7.5px] truncate mt-0.5" style={{ color: 'rgb(51,65,85)' }}>
                    {link.url}
                  </div>
                </div>
                {link.dot && (
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: link.dot === 'amber' ? 'rgb(245,158,11)' : 'rgb(34,197,94)' }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Preview pane */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Link header */}
            <div
              className="px-4 py-3 flex gap-3 flex-shrink-0"
              style={{ background: 'rgb(8,12,28)', borderBottom: '1px solid rgb(30,41,59)' }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-[10.5px] font-semibold truncate mb-0.5 text-slate-200">
                  React Query — Async State Management
                </div>
                <div className="text-[8px] mb-1.5 text-indigo-400">
                  tanstack.com/query/latest
                </div>
                <div className="text-[8px] leading-relaxed text-slate-500">
                  Powerful async state management for TS/JS and React. Fetch, cache, sync and update server state.
                </div>
              </div>
              <div
                className="w-14 h-10 rounded-md flex-shrink-0"
                style={{
                  border: '1px solid rgb(30,41,59)',
                  background: 'linear-gradient(135deg, rgb(99,102,241), rgb(139,92,246))',
                }}
              />
            </div>

            {/* Fake loaded webpage in the archive preview area */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Browser address bar */}
              <div
                className="flex-shrink-0 flex items-center gap-1.5 px-2.5 h-6"
                style={{ background: 'rgb(15,23,42)', borderBottom: '1px solid rgb(30,41,59)' }}
              >
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                </div>
                <div className="flex-1 h-3 rounded" style={{ background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(51,65,85,0.5)' }} />
              </div>

              {/* Page content */}
              <div className="flex-1 overflow-hidden" style={{ background: '#fff' }}>
                {/* Page nav */}
                <div
                  className="flex items-center gap-2 px-2"
                  style={{ height: 22, background: 'rgb(2,6,23)', borderBottom: '1px solid rgb(30,41,59)' }}
                >
                  <div className="w-3 h-2 rounded-sm bg-indigo-600 flex-shrink-0" />
                  <div className="w-5 h-1.5 rounded bg-slate-700" />
                  <div className="w-5 h-1.5 rounded bg-slate-700" />
                  <div className="w-4 h-1.5 rounded bg-slate-700" />
                </div>
                {/* Page hero */}
                <div
                  className="flex flex-col justify-center px-3 py-2"
                  style={{ height: 56, background: 'linear-gradient(135deg, rgb(79,70,229), rgb(109,40,217))' }}
                >
                  <div className="h-2 rounded mb-1.5 bg-white/80" style={{ width: '58%' }} />
                  <div className="h-1.5 rounded bg-white/40" style={{ width: '38%' }} />
                </div>
                {/* Page content rows */}
                <div className="p-3" style={{ background: 'rgb(248,250,252)' }}>
                  {[82, 68, 90, 54, 76].map((w, i) => (
                    <div
                      key={i}
                      className="rounded mb-1.5"
                      style={{ height: 5, width: `${w}%`, background: 'rgb(203,213,225)' }}
                    />
                  ))}
                  <div className="flex gap-2 mt-2">
                    <div className="h-10 rounded flex-1" style={{ background: 'rgb(226,232,240)' }} />
                    <div className="h-10 rounded flex-1" style={{ background: 'rgb(226,232,240)' }} />
                    <div className="h-10 rounded flex-1" style={{ background: 'rgb(226,232,240)' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Create form ───────────────────────────────────────────────────────────

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
        className="btn-shimmer p-3.5 md:px-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-[15px] whitespace-nowrap flex items-center justify-center flex-shrink-0"
        style={DISPLAY}
      >
        {isPending ? (
          <>
            <svg className="w-5 h-5 md:hidden animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
            <span className="hidden md:inline">Creating…</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span className="hidden md:inline">Create pouch →</span>
          </>
        )}
      </button>
    </form>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [newStashName, setNewStashName] = useState('');
  const navigate = useNavigate();
  const { history, removeEntry, clearHistory } = useStashHistory();
  const featuresRef = useReveal();
  const stepsRef    = useReveal();
  const faqRef      = useReveal();
  const roadmapRef  = useReveal();

  const createMutation = useMutation({
    mutationFn: (name: string) => stashApi.createStash({ name }),
    onSuccess: (response) => {
      const signedUrl = response.data.signedUrl;
      if (signedUrl) {
        const stashId = new URL(signedUrl).pathname.split('/')[2];
        sessionStorage.setItem(`lp:walkthrough:new:${stashId}`, '1');
        navigate(new URL(signedUrl).pathname);
      }
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
        {/* Animated gradient blobs */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="animate-blob absolute rounded-full"
            style={{
              top: '-15%', left: '-10%',
              width: 700, height: 700,
              background: 'radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 65%)',
              filter: 'blur(40px)',
            }}
          />
          <div
            className="animate-blob-2 absolute rounded-full"
            style={{
              bottom: '-10%', right: '-5%',
              width: 600, height: 600,
              background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 65%)',
              filter: 'blur(50px)',
            }}
          />
          {/* Subtle grid */}
          <div
            className="absolute inset-0 opacity-[0.025]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
          {/* Grain */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.035]" aria-hidden="true">
            <filter id="hero-grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4" stitchTiles="stitch" />
            </filter>
            <rect width="100%" height="100%" filter="url(#hero-grain)" />
          </svg>
        </div>

        <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-16">
          {/* Two-column layout: text left, mockup right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left: headline + CTA */}
            <div>
              {/* Badge */}
              <div
                className="animate-slide-up inline-flex items-center gap-2 border border-indigo-700/40 bg-indigo-950/50 rounded-full px-4 py-1.5 mb-10"
                style={{ animationDelay: '0ms' }}
              >
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                <span className="text-sm text-indigo-300 font-medium" style={MONO}>No account required</span>
              </div>

              {/* Headline */}
              <h1
                className="animate-slide-up text-white mb-6 leading-[1.08] tracking-tight"
                style={{ ...DISPLAY, fontSize: 'clamp(44px, 5.5vw, 76px)', animationDelay: '80ms' }}
              >
                Save links.{' '}
                <span
                  className="bg-clip-text text-transparent animated-gradient"
                  style={{ backgroundImage: 'linear-gradient(135deg, #818cf8, #a78bfa, #c084fc, #a78bfa, #818cf8)' }}
                >
                  Find them fast.
                </span>
              </h1>

              {/* Subtitle */}
              <p
                className="animate-slide-up text-lg text-slate-400 max-w-xl mb-10 leading-relaxed"
                style={{ animationDelay: '160ms' }}
              >
                Private link pouches with auto screenshots, full-text search, and archive previews.
                Just a secret URL — zero setup, zero accounts.
              </p>

              {/* CTA form */}
              <div className="animate-slide-up mb-6" style={{ animationDelay: '240ms' }}>
                <CreateForm
                  value={newStashName}
                  onChange={setNewStashName}
                  onSubmit={handleSubmit}
                  isPending={createMutation.isPending}
                />
              </div>

              {/* Trust indicators */}
              <div
                className="animate-slide-up flex items-center gap-6 flex-wrap"
                style={{ animationDelay: '320ms' }}
              >
                {['Free, no limits', 'Zero sign-up', 'Private by design', 'No tracking'].map((item) => (
                  <div key={item} className="flex items-center gap-1.5 text-slate-500 text-sm" style={MONO}>
                    <svg className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: history panel (when entries exist) or floating skeleton mockup */}
            <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
              {history.length > 0 ? (
                <RecentPouchesPanel
                  history={history}
                  removeEntry={removeEntry}
                  clearHistory={clearHistory}
                />
              ) : (
                <div className="animate-float">
                  <AppMockup />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white dark:bg-slate-900">
        <div ref={featuresRef} className="max-w-6xl mx-auto">
          <div className="text-center mb-16 reveal-up">
            <span className="text-xs font-medium tracking-widest uppercase text-indigo-500 dark:text-indigo-400 mb-4 block" style={MONO}>
              Features
            </span>
            <h2
              className="text-3xl md:text-4xl text-slate-900 dark:text-slate-100 mb-3 tracking-tight"
              style={DISPLAY}
            >
              Everything you need
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-md mx-auto">
              Powerful enough to actually use, simple enough to stay out of the way.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="feature-card reveal-up p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
                style={{ transitionDelay: `${i * 45}ms` }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-[14px]">{f.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-50 dark:bg-slate-950">
        <div ref={stepsRef} className="max-w-4xl mx-auto">
          <div className="text-center mb-14 reveal-up">
            <span className="text-xs font-medium tracking-widest uppercase text-indigo-500 dark:text-indigo-400 mb-4 block" style={MONO}>
              How it works
            </span>
            <h2
              className="text-3xl md:text-4xl text-slate-900 dark:text-slate-100 tracking-tight"
              style={DISPLAY}
            >
              Up and running in seconds
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <div
                key={step.n}
                className="reveal-up relative flex flex-col bg-white dark:bg-slate-900 rounded-2xl p-7 shadow-sm border border-slate-100 dark:border-slate-800"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                {/* Large background step number */}
                <span
                  className="absolute top-5 right-6 text-slate-100 dark:text-slate-800 select-none leading-none"
                  style={{ ...DISPLAY, fontSize: 56, letterSpacing: -3 }}
                  aria-hidden="true"
                >
                  {step.n}
                </span>
                <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 mb-5">
                  {step.icon}
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-[16px]">{step.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-white dark:bg-slate-900">
        <div ref={faqRef} className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-start reveal-up">
            {/* Left: intro */}
            <div>
              <span className="text-xs font-medium tracking-widest uppercase text-indigo-500 dark:text-indigo-400 mb-4 block" style={MONO}>
                Privacy first
              </span>
              <h2
                className="text-3xl md:text-4xl text-slate-900 dark:text-slate-100 mb-4 tracking-tight"
                style={DISPLAY}
              >
                Questions answered
              </h2>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Linkpouch is built around privacy and simplicity. Your URL is your key —
                no account, no email, no password to forget.
              </p>
            </div>

            {/* Right: Q&A */}
            <div className="space-y-6">
              {FAQS.map((faq) => (
                <div key={faq.q} className="border-b border-slate-100 dark:border-slate-800 pb-6 last:border-0 last:pb-0">
                  <div className="flex gap-3">
                    <div className="w-1 h-1 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-[15px]">{faq.q}</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{faq.a}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Roadmap ───────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-slate-50 dark:bg-slate-950">
        <div ref={roadmapRef} className="max-w-6xl mx-auto">
          <div className="text-center mb-16 reveal-up">
            <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium" style={MONO}>Actively developed</span>
            </div>
            <h2
              className="text-3xl md:text-4xl text-slate-900 dark:text-slate-100 mb-3 tracking-tight"
              style={DISPLAY}
            >
              More on the way
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-xl mx-auto">
              Linkpouch ships improvements regularly. Here's what's on the horizon.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ROADMAP.map((item, i) => (
              <div
                key={item.title}
                className="roadmap-card reveal-up bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 flex gap-4 items-start"
                style={{ transitionDelay: `${i * 35}ms` }}
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 text-[14px]">{item.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-slate-400 dark:text-slate-500 text-sm mt-10">
            Have a suggestion?{' '}
            <a
              href="https://github.com/jamezrin/linkpouch"
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
        {/* Violet glow from top */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.25) 0%, transparent 60%)',
          }}
        />

        <div className="relative max-w-md mx-auto">
          <span className="text-xs font-medium tracking-widest uppercase text-indigo-400 mb-4 block" style={MONO}>
            Get started
          </span>
          <h2
            className="text-3xl md:text-4xl text-white mb-3 tracking-tight"
            style={DISPLAY}
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
          <p className="text-slate-700 text-sm" style={MONO}>Your pouch URL is the only thing you need to keep.</p>
        </div>

        {/* Footer */}
        <div className="relative mt-20 border-t border-slate-800/60 pt-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-5 h-5 bg-indigo-600 rounded-md flex items-center justify-center">
              <PouchIcon className="w-3 h-3 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-semibold text-slate-500" style={DISPLAY}>linkpouch</span>
          </div>
          <p className="text-slate-700 text-xs mb-5" style={MONO}>Save links. Find them fast.</p>
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
