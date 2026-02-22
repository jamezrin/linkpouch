import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import HomePage from './pages/HomePage';
import StashAccessPage from './pages/StashAccessPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <h1 className="text-2xl font-bold text-gray-900">
                <a href="/">Linkpouch</a>
              </h1>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/s/:stashId/:signature" element={<StashAccessPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
