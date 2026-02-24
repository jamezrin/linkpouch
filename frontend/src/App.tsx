import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from './pages/HomePage';
import StashAccessPage from './pages/StashAccessPage';
import DemoButton from './components/DemoButton';
import { features } from './features';

const queryClient = new QueryClient();

// Matches /s/:stashId/:signature and captures both segments
const STASH_PATH_RE = /^\/s\/([^/]+)\/([^/]+)/;

function AppContent() {
  const location = useLocation();
  const stashMatch = STASH_PATH_RE.exec(location.pathname);
  const isStashPage = stashMatch !== null;
  const stashId = stashMatch?.[1];
  const signature = stashMatch?.[2];

  return (
    <div className={`flex flex-col ${isStashPage ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      <header className="h-14 flex-shrink-0 bg-slate-950 border-b border-slate-800 flex items-center px-6 gap-3">
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-500 transition-colors">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
          <span className="text-[15px] font-semibold text-white tracking-tight">linkpouch</span>
        </a>

        {/* Spacer */}
        <div className="flex-1" />

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
