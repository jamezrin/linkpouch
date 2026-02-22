import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { stashApi } from '../services/api';
import { Stash } from '../types';

export default function HomePage() {
  const [newStashName, setNewStashName] = useState('');
  const [createdStash, setCreatedStash] = useState<Stash | null>(null);
  const [showModal, setShowModal] = useState(false);

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center py-16 px-4">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Your Links,{' '}
          <span className="text-blue-600">Organized</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Create private collections of links with automatic screenshots, 
          full-text search, and instant sharing via secure URLs.
        </p>
        
        {/* CTA - Create Stash Form */}
        <div className="max-w-md mx-auto">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={newStashName}
              onChange={(e) => setNewStashName(e.target.value)}
              placeholder="Name your stash..."
              className="flex-1 px-6 py-4 text-lg border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </form>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white rounded-3xl">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Linkpouch?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Private by Default</h3>
              <p className="text-gray-600">
                Your stashes are completely private. Access is only possible through secure, signed URLs that you control.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Auto Screenshots</h3>
              <p className="text-gray-600">
                Every link gets an automatic screenshot, so you can visually browse your collection at a glance.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Full-Text Search</h3>
              <p className="text-gray-600">
                Search through link titles, descriptions, and even page content to quickly find what you need.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          
          <div className="space-y-8">
            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl shrink-0">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Create a Stash</h3>
                <p className="text-gray-600">
                  Give your collection a name. Each stash gets a unique secret key for secure access.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl shrink-0">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Add Links</h3>
                <p className="text-gray-600">
                  Paste URLs into your stash. We automatically fetch metadata, screenshots, and content.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-6">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl shrink-0">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Share Securely</h3>
                <p className="text-gray-600">
                  Copy your signed URL and share it. Only people with the link can access your stash.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Success Modal */}
      {showModal && createdStash && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Stash Created!</h3>
              <p className="text-gray-600">
                Your stash "{createdStash.name}" is ready. Save this URL - it's the only way to access it!
              </p>
            </div>

            <div className="bg-gray-100 rounded-lg p-4 mb-6">
              <code className="text-sm text-gray-800 break-all block">
                {createdStash.signedUrl}
              </code>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => copyToClipboard(createdStash.signedUrl!)}
                className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Copy URL
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setCreatedStash(null);
                }}
                className="px-4 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Create Another
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
