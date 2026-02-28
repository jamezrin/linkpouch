import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import HomePage from './pages/HomePage';
import StashAccessPage from './pages/StashAccessPage';
import DemoButton from './components/DemoButton';
import ThemeToggle from './components/ThemeToggle';
import { features } from './features';
import { StashSearchContext } from './contexts/stashSearch';
import { ThemeProvider } from './contexts/theme';
import { stashApi } from './services/api';

const queryClient = new QueryClient();

// Matches /s/:stashId/:signature and captures both segments
const STASH_PATH_WITH_SIG_RE = /^\/s\/([^/]+)\/([^/]+)/;
// Matches /s/:stashId (clean URL without signature)
const STASH_PATH_CLEAN_RE = /^\/s\/([^/]+)$/;

function AppContent() {
  const location = useLocation();

  const sigMatch = STASH_PATH_WITH_SIG_RE.exec(location.pathname);
  const cleanMatch = STASH_PATH_CLEAN_RE.exec(location.pathname);

  const isStashPage = sigMatch !== null || cleanMatch !== null;
  const stashId = sigMatch?.[1] ?? cleanMatch?.[1];
  const signature = sigMatch?.[2] ?? null;

  const [searchQuery, setSearchQuery] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const queryClient = useQueryClient();

  const { data: stash } = useQuery({
    queryKey: ['stash', stashId],
    queryFn: async () => {
      const res = await stashApi.getStash(stashId!, signature!);
      setEditedName(res.data.name);
      return res.data;
    },
    enabled: !!stashId && !!signature,
  });

  const updateStashMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await stashApi.updateStash(stashId!, signature!, { name });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stash', stashId] });
      setEditedName(data.name);
      setIsEditingName(false);
    },
    onError: () => {
      alert('Failed to rename pouch');
      setEditedName(stash?.name || '');
      setIsEditingName(false);
    },
  });

  const handleNameClick = () => {
    setIsEditingName(true);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedName(e.target.value);
  };

  const handleNameSave = () => {
    const trimmedName = editedName.trim();
    if (!trimmedName) {
      setEditedName(stash?.name || '');
      setIsEditingName(false);
      return;
    }
    if (trimmedName !== stash?.name) {
      updateStashMutation.mutate(trimmedName);
    } else {
      setIsEditingName(false);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleNameSave();
    } else if (e.key === 'Escape') {
      setEditedName(stash?.name || '');
      setIsEditingName(false);
    }
  };

  return (
    <StashSearchContext.Provider value={{ searchQuery, setSearchQuery }}>
      <div className={`flex flex-col ${isStashPage ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
        <header className="h-14 flex-shrink-0 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center px-6 gap-3 relative">
          {/* Logo / home link */}
          <a href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-500 transition-colors">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold text-slate-900 dark:text-white tracking-tight">linkpouch</span>
          </a>

          {/* Breadcrumb — only on stash pages with a valid signature */}
          {isStashPage && signature && (
            <>
              <span className="text-slate-400 dark:text-slate-600 text-sm flex-shrink-0 select-none">/</span>
              {isEditingName ? (
                <input
                  type="text"
                  value={editedName}
                  onChange={handleNameChange}
                  onBlur={handleNameSave}
                  onKeyDown={handleNameKeyDown}
                  autoFocus
                  className="text-[14px] font-medium text-slate-800 dark:text-slate-100 bg-slate-100 dark:bg-slate-800/60 border border-indigo-500/70 rounded px-2 py-0.5 max-w-[180px] flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                  disabled={updateStashMutation.isPending}
                />
              ) : (
                <span
                  onClick={handleNameClick}
                  className="text-[14px] font-medium text-slate-600 dark:text-slate-300 truncate max-w-[180px] flex-shrink-0 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  title="Click to rename"
                >
                  {stash?.name ?? '…'}
                </span>
              )}
            </>
          )}

          {/* Search bar — absolutely centered in the header */}
          {isStashPage && signature ? (
            <div className="absolute left-1/2 -translate-x-1/2 w-full max-w-sm px-4 pointer-events-none">
              <div className="relative pointer-events-auto">
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
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-slate-700/70 rounded-lg text-[13px] text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          ) : (
            <div className="flex-1" />
          )}

          {/* Spacer to push right-side controls when on stash page */}
          {isStashPage && <div className="flex-1" />}

          {/* Share button — only on stash pages with a valid signature */}
          {isStashPage && signature && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href).then(() => {
                  setShareCopied(true);
                  setTimeout(() => setShareCopied(false), 2000);
                });
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              title="Copy shareable link"
            >
              {shareCopied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-green-500">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>Share</span>
                </>
              )}
            </button>
          )}

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Demo button — only on stash pages, gated by feature flag */}
          {features.demoButton && isStashPage && stashId && signature && (
            <DemoButton stashId={stashId} signature={signature} />
          )}
        </header>
        <main className={`flex-1 ${isStashPage ? 'overflow-hidden' : ''}`}>
          {isStashPage && !signature ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
              <svg className="w-10 h-10 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              <p className="text-[15px] font-medium text-slate-700 dark:text-slate-300">Link is missing access key</p>
              <p className="text-[13px] text-slate-500 dark:text-slate-500 max-w-xs">
                Open the original signed link to access this pouch. The URL must include the access key after the pouch ID.
              </p>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/s/:stashId/:signature" element={<StashAccessPage />} />
              <Route path="/s/:stashId" element={<StashAccessPage />} />
            </Routes>
          )}
        </main>
      </div>
    </StashSearchContext.Provider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AppContent />
        </Router>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
