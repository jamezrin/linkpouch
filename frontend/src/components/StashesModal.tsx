import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAccount } from '../contexts/account';
import { accountApi } from '../services/accountApi';
import AccountStashCard from './AccountStashCard';
import { useScrollLock } from '../hooks/useScrollLock';

interface Props {
  onClose: () => void;
}

type SortField = 'createdAt' | 'updatedAt' | 'name';
type SortDir = 'asc' | 'desc';

const ChevronIcon = ({ dir }: { dir: SortDir }) => (
  <svg className="w-3 h-3 inline ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d={dir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'}
    />
  </svg>
);

export default function StashesModal({ onClose }: Props) {
  const { accountToken, isSignedIn } = useAccount();
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState<SortField>('createdAt');
  const [dir, setDir] = useState<SortDir>('desc');
  const sentinelRef = useRef<HTMLDivElement>(null);
  useScrollLock();

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 250);
  }

  function handleSortClick(field: SortField) {
    if (sort === field) {
      setDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSort(field);
      setDir('desc');
    }
  }

  const {
    data,
    isLoading,
    error: fetchError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['account-stashes', debouncedSearch, sort, dir],
    queryFn: ({ pageParam = 0 }) =>
      accountApi.listStashes(accountToken!, {
        search: debouncedSearch || undefined,
        sort,
        dir,
        page: pageParam as number,
        size: 20,
      }).then((r) => r.data),
    getNextPageParam: (last) =>
      last.number + 1 < last.totalPages ? last.number + 1 : undefined,
    initialPageParam: 0,
    enabled: isSignedIn && !!accountToken,
  });

  const stashes = data?.pages.flatMap((p) => p.content) ?? [];
  const totalElements = data?.pages[0]?.totalElements ?? 0;

  // Infinite scroll sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '100px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, stashes.length]);

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSortClick(field)}
      className={[
        'text-[11px] font-semibold uppercase tracking-wider transition-colors',
        sort === field
          ? 'text-indigo-500 dark:text-indigo-400'
          : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300',
      ].join(' ')}
    >
      {label}
      {sort === field && <ChevronIcon dir={dir} />}
    </button>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Panel — bottom sheet on mobile, centered dialog on desktop */}
      <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center md:p-4 pointer-events-none">
        <div
          className={[
            'w-full md:max-w-lg pointer-events-auto',
            'bg-white dark:bg-slate-900',
            'rounded-t-2xl md:rounded-xl',
            'shadow-2xl',
            'border border-slate-200/80 dark:border-slate-800',
            'flex flex-col',
            'max-h-[88dvh] md:max-h-[80dvh]',
            'transition-all duration-300 ease-out',
            visible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4 md:translate-y-2',
          ].join(' ')}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Your pouches</h2>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search bar */}
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pouches…"
                className="flex-1 min-w-0 bg-transparent text-[13px] text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Sort bar */}
          <div className="px-5 py-2 border-b border-slate-100 dark:border-slate-800 flex-shrink-0 flex items-center gap-3">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">Sort:</span>
            <SortHeader field="createdAt" label="Created" />
            <SortHeader field="updatedAt" label="Updated" />
            <SortHeader field="name" label="Name" />
            {totalElements > 0 && (
              <span className="ml-auto text-[11px] text-slate-400 dark:text-slate-500">
                {totalElements} total
              </span>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
            {isLoading && (
              <p className="text-[13px] text-slate-400 text-center py-10">Loading…</p>
            )}

            {fetchError && (
              <div className="px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-[13px] text-red-700 dark:text-red-400">
                Failed to load your pouches.
              </div>
            )}

            {!isLoading && !fetchError && stashes.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <svg className="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-[13px] text-slate-400">
                  {debouncedSearch ? 'No pouches match your search.' : 'No pouches claimed yet.'}
                </p>
                {!debouncedSearch && (
                  <p className="text-[12px] text-slate-400 max-w-xs">
                    Open a pouch with its signed URL and claim it from the settings panel.
                  </p>
                )}
              </div>
            )}

            {stashes.map((stash) => (
              <AccountStashCard key={stash.stashId} stash={stash} />
            ))}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-px" />
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-3">
                <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
