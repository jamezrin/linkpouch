import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import HomePage from './pages/HomePage';
import StashAccessPage from './pages/StashAccessPage';
import DemoButton from './components/DemoButton';
import { features } from './features';
import { StashSearchContext } from './contexts/stashSearch';
import { stashApi } from './services/api';

const queryClient = new QueryClient();

// Matches /s/:stashId/:signature and captures both segments
const STASH_PATH_RE = /^\/s\/([^/]+)\/([^/]+)/;

function AppContent() {
  const location = useLocation();
  const stashMatch = STASH_PATH_RE.exec(location.pathname);
  const isStashPage = stashMatch !== null;
  const stashId = stashMatch?.[1];
  const signature = stashMatch?.[2];

  const [searchQuery, setSearchQuery] = useState('');

  const { data: stash } = useQuery({
    queryKey: ['stash', stashId],
    queryFn: async () => {
      const res = await stashApi.getStash(stashId!, signature!);
      return res.data;
    },
    enabled: !!stashId && !!signature,
  });

  return (
    <StashSearchContext.Provider value={{ searchQuery, setSearchQuery }}>
      <div className={`flex flex-col ${isStashPage ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
        <header className="h-14 flex-shrink-0 bg-slate-950 border-b border-slate-800 flex items-center px-6 gap-3">
          {/* Logo / home link */}
          <a href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-500 transition-colors">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold text-white tracking-tight">linkpouch</span>
          </a>

          {/* Breadcrumb — only on stash pages */}
          {isStashPage && (
            <>
              <span className="text-slate-700 text-sm flex-shrink-0 select-none">/</span>
              <span className="text-[14px] font-medium text-slate-300 truncate max-w-[180px] flex-shrink-0">
                {stash?.name ?? '…'}
              </span>
            </>
          )}

          {/* Search bar — only on stash pages, fills remaining space */}
          {isStashPage ? (
            <div className="flex-1 flex items-center">
              <div className="relative w-full max-w-sm">
                <svg
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search links…"
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-800/60 border border-slate-700/70 rounded-lg text-[13px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {/* Demo button — only on stash pages, gated by feature flag */}
          {features.demoButton && isStashPage && stashId && signature && (
            <DemoButton stashId={stashId} signature={signature} />
          )}
        </header>
        <main className={`flex-1 ${isStashPage ? 'overflow-hidden' : ''}`}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/s/:stashId/:signature" element={<StashAccessPage />} />
          </Routes>
        </main>
      </div>
    </StashSearchContext.Provider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
