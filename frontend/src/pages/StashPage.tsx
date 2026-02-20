import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stashApi, linkApi } from '../services/api';
import { Link } from '../types';

export default function StashPage() {
  const { stashId } = useParams<{ stashId: string }>();
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { data: stash } = useQuery({
    queryKey: ['stash', stashId],
    queryFn: async () => {
      const response = await stashApi.getStash(stashId!);
      return response.data;
    },
    enabled: !!stashId,
  });

  const { data: linksData, isLoading: linksLoading } = useQuery({
    queryKey: ['links', stashId, searchQuery],
    queryFn: async () => {
      const response = await linkApi.listLinks(stashId!, searchQuery || undefined);
      return response.data;
    },
    enabled: !!stashId,
  });

  const addLinkMutation = useMutation({
    mutationFn: (url: string) => linkApi.addLink(stashId!, { url }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', stashId] });
      setNewLinkUrl('');
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: (linkId: string) => linkApi.deleteLink(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', stashId] });
    },
  });

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLinkUrl.trim()) {
      addLinkMutation.mutate(newLinkUrl.trim());
    }
  };

  if (!stashId) {
    return <div>Invalid stash ID</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{stash?.name}</h2>
        <p className="text-gray-600">{stash?.linkCount} links</p>
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
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search links..."
          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        {linksLoading ? (
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
