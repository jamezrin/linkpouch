import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { stashApi } from '../services/api';
import { Stash } from '../types';

export default function HomePage() {
  const [newStashName, setNewStashName] = useState('');
  const queryClient = useQueryClient();

  const { data: stashes, isLoading } = useQuery({
    queryKey: ['stashes'],
    queryFn: async () => {
      const response = await stashApi.listStashes();
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => stashApi.createStash({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stashes'] });
      setNewStashName('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStashName.trim()) {
      createMutation.mutate(newStashName.trim());
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Create New Stash</h2>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={newStashName}
            onChange={(e) => setNewStashName(e.target.value)}
            placeholder="Enter stash name..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Your Stashes</h2>
        {stashes?.length === 0 ? (
          <p className="text-gray-500">No stashes yet. Create one above!</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stashes?.map((stash: Stash) => (
              <Link
                key={stash.id}
                to={`/stashes/${stash.id}`}
                className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-semibold mb-2">{stash.name}</h3>
                <p className="text-gray-600">{stash.linkCount} links</p>
                <p className="text-sm text-gray-400 mt-2">
                  Created {new Date(stash.createdAt).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
