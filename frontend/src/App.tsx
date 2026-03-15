import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import HomePage from './pages/HomePage';
import StashAccessPage from './pages/StashAccessPage';
import AccountPage from './pages/AccountPage';
import ThemeToggle from './components/ThemeToggle';
import AccountDropdown from './components/AccountDropdown';
import MobileAccountSection from './components/MobileAccountSection';
import { StashSearchContext } from './contexts/stashSearch';
import { ThemeProvider } from './contexts/theme';
import { AccountProvider, useAccount } from './contexts/account';
import { stashApi } from './services/api';
import { useStashToken } from './hooks/useStashToken';
import { useStashHistory } from './hooks/useStashHistory';
import { PouchIcon } from './components/PouchIcon';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<'list' | 'preview'>('list');
  const [stashSettingsOpen, setStashSettingsOpen] = useState(false);
  const [canWrite, setCanWrite] = useState(true);
  const [isClaimerToken, setIsClaimerToken] = useState(false);
  const queryClient = useQueryClient();

  const { isSignedIn } = useAccount();
  const { token: accessToken } = useStashToken(stashId);
  const { recordEntry } = useStashHistory();

  // Close mobile menu and reset pane whenever the route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setMobilePane('list');
  }, [location.pathname]);

  const { data: stash } = useQuery({
    queryKey: ['stash', stashId],
    queryFn: async () => {
      const res = await stashApi.getStash(stashId!, accessToken!);
      return res.data;
    },
    enabled: !!stashId && !!accessToken,
  });

  // Sync editedName whenever the stash name changes (from this query or shared cache)
  useEffect(() => {
    if (stash?.name) setEditedName(stash.name);
  }, [stash?.name]);

  // Record stash in local history whenever we have a valid signed URL + loaded stash
  useEffect(() => {
    if (stashId && stash?.name && signature) {
      recordEntry(stashId, stash.name, signature);
    }
  }, [stashId, stash?.name, signature, recordEntry]);

  const updateStashMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await stashApi.updateStash(stashId!, accessToken!, { name });
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
    <StashSearchContext.Provider value={{ searchQuery, setSearchQuery, mobilePane, setMobilePane, stashSettingsOpen, setStashSettingsOpen, canWrite, setCanWrite, isClaimerToken, setIsClaimerToken }}>
      <div className={`flex flex-col bg-white dark:bg-slate-950 ${isStashPage ? 'h-dvh overflow-hidden' : 'min-h-dvh'}`}>
        <header className={`h-14 flex-shrink-0 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 items-center px-6 gap-3 relative ${isStashPage && mobilePane === 'preview' ? 'hidden md:flex' : 'flex'}`}>
          {/* Logo / home link */}
          <a href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-500 transition-colors">
              <PouchIcon className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
            <span className="text-[15px] font-semibold text-slate-900 dark:text-white tracking-tight">linkpouch</span>
          </a>

          {/* Breadcrumb — on stash pages with a signature or when accessing as claimer */}
          {isStashPage && (signature || isClaimerToken) && (
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
                  id="lp-stash-name"
                  onClick={canWrite ? handleNameClick : undefined}
                  className={`text-[14px] font-medium text-slate-600 dark:text-slate-300 truncate max-w-[180px] flex-shrink-0 transition-colors${canWrite ? ' cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400' : ''}`}
                  title={canWrite ? 'Click to rename' : undefined}
                >
                  {stash?.name ?? '…'}
                </span>
              )}
            </>
          )}

          <div className="flex-1" />

          {/* Share button — desktop only */}
          {isStashPage && signature && (
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href).then(() => {
                  setShareCopied(true);
                  setTimeout(() => setShareCopied(false), 2000);
                });
              }}
              id="lp-share-button"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
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

          {/* Settings button — desktop only, stash pages only, hidden for read-only visitors */}
          {isStashPage && (signature || isClaimerToken) && (canWrite || isClaimerToken) && (
            <button
              id="lp-settings-button"
              onClick={() => setStashSettingsOpen((o) => !o)}
              title="Stash settings"
              className={[
                'hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors',
                stashSettingsOpen
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white',
              ].join(' ')}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>
          )}

          {/* Theme toggle — desktop only */}
          <div className="hidden md:block">
            <ThemeToggle />
          </div>

          {/* Account dropdown — desktop only */}
          <div id="lp-account-button" className="hidden md:block">
            <AccountDropdown />
          </div>

          {/* Hamburger — mobile only */}
          <button
            className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>

          {/* Mobile dropdown menu */}
          {mobileMenuOpen && (
            <>
              {/* Transparent backdrop — closes menu on outside tap */}
              <div className="fixed inset-0 z-40" onClick={() => setMobileMenuOpen(false)} />
              <div className="md:hidden absolute top-full right-0 z-50 mt-1 mr-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg p-3 min-w-[200px] flex flex-col gap-1">
                {/* Account section */}
                <MobileAccountSection onAction={() => setMobileMenuOpen(false)} />

                {/* Divider — always separates account from rest */}
                <div className="border-t border-slate-100 dark:border-slate-800 -mx-3 my-2" />

                {/* Share */}
                {isStashPage && signature && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href).then(() => {
                        setShareCopied(true);
                        setTimeout(() => setShareCopied(false), 2000);
                      });
                    }}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] font-medium transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white w-full text-left"
                  >
                    {shareCopied ? (
                      <>
                        <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-green-500">Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                        </svg>
                        <span>Share link</span>
                      </>
                    )}
                  </button>
                )}

                {/* Settings — mobile, hidden for read-only visitors */}
                {isStashPage && (signature || isClaimerToken) && (canWrite || isClaimerToken) && (
                  <button
                    onClick={() => { setStashSettingsOpen(true); setMobileMenuOpen(false); }}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] font-medium transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white w-full text-left"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </button>
                )}

                {/* Divider before theme if stash actions are shown */}
                {isStashPage && signature && (
                  <div className="border-t border-slate-100 dark:border-slate-800 -mx-3 my-2" />
                )}

                {/* Theme */}
                <div>
                  <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide px-2 mb-2">Theme</p>
                  <ThemeToggle />
                </div>
              </div>
            </>
          )}
        </header>
        <main className={`flex-1 ${isStashPage ? 'overflow-hidden' : ''}`}>
          {isStashPage && !signature && !isSignedIn ? (
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
              <Route path="/account" element={<AccountPage />} />
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
          <AccountProvider>
            <AppContent />
          </AccountProvider>
        </Router>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
