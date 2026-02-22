import { useState, useDeferredValue } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { stashApi, linkApi } from '../services/api';
import { Link } from '../types';

export default function StashAccessPage() {
  const { stashId, signature } = useParams<{ stashId: string; signature: string }>();
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const searchQuery = useDeferredValue(searchInput);
  const queryClient = useQueryClient();

  // Validate required params
  if (!stashId || !signature) {
    return <Navigate to="/" replace />;
  }

  const { data: stash, isLoading: stashLoading, error: stashError } = useQuery({
    queryKey: ['stash', stashId],
    queryFn: async () => {
      const response = await stashApi.getStash(stashId, signature);
      return response.data;
    },
    enabled: !!stashId && !!signature,
  });

  const { data: linksData, isLoading: linksLoading, error: linksError } = useQuery({
    queryKey: ['links', stashId, searchQuery],
    queryFn: async () => {
      const response = await linkApi.listLinks(stashId, signature, searchQuery || undefined);
      return response.data;
    },
    enabled: !!stashId && !!signature,
  });

  const addLinkMutation = useMutation({
    mutationFn: (url: string) => linkApi.addLink(stashId!, signature!, { url }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', stashId, searchQuery] });
      setNewLinkUrl('');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to add link';
      alert(`Error: ${message}`);
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: (linkId: string) => linkApi.deleteLink(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', stashId, searchQuery] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to delete link';
      alert(`Error: ${message}`);
    },
  });

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLinkUrl.trim()) {
      addLinkMutation.mutate(newLinkUrl.trim());
    }
  };

  // Handle unauthorized access (invalid signature)
  if (stashError instanceof AxiosError && stashError.response?.status === 401) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-6">
          This stash requires a valid signature to access. Please check your URL and try again.
        </p>
        <a href="/" className="text-blue-600 hover:underline">
          Go back home
        </a>
      </div>
    );
  }

  // Handle stash not found
  if (stashError instanceof AxiosError && stashError.response?.status === 404) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Stash Not Found</h2>
        <p className="text-gray-600 mb-6">
          The stash you're looking for doesn't exist or has been deleted.
        </p>
        <a href="/" className="text-blue-600 hover:underline">
          Go back home
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        {stashLoading ? (
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
        ) : (
          <>
            <h2 className="text-2xl font-bold">{stash?.name}</h2>
            <p className="text-gray-600">{stash?.linkCount} links</p>
          </>
        )}
      </div>

      <div className="mb-6 space-y-4">
        <form onSubmit={handleAddLink} className="flex gap-2">
          <input
            type="url"
            value={newLinkUrl}
            onChange={(e) => setNewLinkUrl(e.target.value)}
            placeholder="Enter URL to add..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={addLinkMutation.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {addLinkMutation.isPending ? 'Adding...' : 'Add Link'}
          </button>
        </form>

        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search links..."
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        {linksError ? (
          <div className="text-red-600">Failed to load links. Please try again.</div>
        ) : linksLoading ? (
          <div>Loading links...</div>
        ) : linksData?.content.length === 0 ? (
          <p className="text-gray-500">No links yet. Add one above!</p>
        ) : (
          <div className="space-y-4">
            {linksData?.content.map((link: Link) => (
              <div key={link.id} className="p-4 bg-white rounded-lg shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {link.title || link.url}
                    </a>
                    {link.description && (
                      <p className="text-gray-600 mt-1">{link.description}</p>
                    )}
                    <p className="text-sm text-gray-400 mt-1">
                      Added {new Date(link.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteLinkMutation.mutate(link.id)}
                    disabled={deleteLinkMutation.isPending}
                    className="ml-4 text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
