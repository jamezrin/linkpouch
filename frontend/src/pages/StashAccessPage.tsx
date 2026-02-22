import { useState, useMemo, useCallback, useEffect, useRef, CSSProperties } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { List, ListImperativeAPI } from 'react-window';
import {
  DragDropContext,
  Droppable,
  DropResult,
  DroppableProvided,
} from '@hello-pangea/dnd';
import { stashApi, linkApi } from '../services/api';
import { Link as LinkType } from '../types';

interface LinkItemProps {
  link: LinkType;
  isSelected: boolean;
  isMultiSelectMode: boolean;
  onSelect: (linkId: string, isCtrlClick: boolean) => void;
  style: CSSProperties;
}

const LinkItem = ({ link, isSelected, isMultiSelectMode, onSelect, style }: LinkItemProps) => {
  const handleClick = (e: React.MouseEvent) => {
    onSelect(link.id, e.ctrlKey || e.metaKey);
  };

  return (
    <div
      style={style}
      className={`px-4 py-3 border-b border-gray-200 cursor-pointer transition-colors hover:bg-gray-50 ${
        isSelected ? 'bg-blue-50 border-blue-300' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        {isMultiSelectMode && (
          <div className="mt-1">
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                isSelected
                  ? 'bg-blue-600 border-blue-600'
                  : 'border-gray-300'
              }`}
            >
              {isSelected && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{link.title || link.url}</h4>
          <p className="text-sm text-gray-500 truncate">{link.url}</p>
          <div className="flex items-center gap-2 mt-1">
            {link.screenshotUrl && (
              <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">
                Has screenshot
              </span>
            )}
            <span className="text-xs text-gray-400">
              {new Date(link.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface RowData {
  links: LinkType[];
  selectedLinkIds: Set<string>;
  isMultiSelectMode: boolean;
  onSelectLink: (linkId: string, isCtrlClick: boolean) => void;
}

interface RowComponentProps {
  index: number;
  style: CSSProperties;
  ariaAttributes: {
    'aria-posinset': number;
    'aria-setsize': number;
    role: 'listitem';
  };
  data?: RowData;
}

const Row = ({
  index,
  style,
  ariaAttributes,
  data,
}: RowComponentProps) => {
  if (!data) return null;
  
  const { links, selectedLinkIds, isMultiSelectMode, onSelectLink } = data;
  const link = links[index];

  if (!link) return null;

  return (
    <div {...ariaAttributes}>
      <LinkItem
        link={link}
        isSelected={selectedLinkIds.has(link.id)}
        isMultiSelectMode={isMultiSelectMode}
        onSelect={onSelectLink}
        style={style}
      />
    </div>
  );
};

export default function StashAccessPage() {
  const { stashId, signature } = useParams<{ stashId: string; signature: string }>();
  const [selectedLinkIds, setSelectedLinkIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [links, setLinks] = useState<LinkType[]>([]);
  const queryClient = useQueryClient();
  const listRef = useRef<ListImperativeAPI>(null);

  // Validate required params
  if (!stashId || !signature) {
    return <Navigate to="/" replace />;
  }

  // Fetch stash details
  const { data: stash, isLoading: stashLoading, error: stashError } = useQuery({
    queryKey: ['stash', stashId],
    queryFn: async () => {
      const response = await stashApi.getStash(stashId, signature);
      return response.data;
    },
    enabled: !!stashId && !!signature,
  });

  // Fetch links with pagination
  const { data: linksData, isLoading: linksLoading } = useQuery({
    queryKey: ['links', stashId],
    queryFn: async () => {
      const response = await linkApi.listLinks(stashId, signature, undefined, 0, 100);
      return response.data;
    },
    enabled: !!stashId && !!signature,
  });

  // Update local links state when data changes
  useEffect(() => {
    if (linksData?.content) {
      setLinks(linksData.content);
    }
  }, [linksData]);

  // Filter links based on search
  const filteredLinks = useMemo(() => {
    if (!searchQuery.trim()) return links;
    const query = searchQuery.toLowerCase();
    return links.filter(
      (link) =>
        link.title?.toLowerCase().includes(query) ||
        link.url.toLowerCase().includes(query) ||
        link.description?.toLowerCase().includes(query)
    );
  }, [links, searchQuery]);

  // Get selected links
  const selectedLinks = useMemo(() => {
    return links.filter((link) => selectedLinkIds.has(link.id));
  }, [links, selectedLinkIds]);

  // Single selected link for preview (only when exactly 1 selected)
  const previewLink = selectedLinks.length === 1 ? selectedLinks[0] : null;

  // Mutations
  const addLinkMutation = useMutation({
    mutationFn: async (url: string) => {
      console.log('MutationFn called with URL:', url);
      const response = await linkApi.addLink(stashId!, signature!, { url });
      console.log('API response:', response);
      return response;
    },
    onSuccess: (data) => {
      console.log('Mutation onSuccess:', data);
      queryClient.invalidateQueries({ queryKey: ['links', stashId] });
      setNewLinkUrl('');
      setIsAddingLink(false);
    },
    onError: (error: unknown) => {
      console.error('Mutation onError:', error);
      const message = error instanceof Error ? error.message : 'Failed to add link';
      alert(`Error: ${message}`);
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: (linkId: string) => linkApi.deleteLink(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', stashId] });
      setSelectedLinkIds(new Set());
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: async (linkIds: string[]) => {
      await Promise.all(linkIds.map((id) => linkApi.deleteLink(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', stashId] });
      setSelectedLinkIds(new Set());
      setIsMultiSelectMode(false);
    },
  });

  const refreshScreenshotMutation = useMutation({
    mutationFn: (linkId: string) => linkApi.refreshScreenshot(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', stashId] });
    },
  });

  // Handlers
  const handleSelectLink = useCallback((linkId: string, isCtrlClick: boolean) => {
    if (isMultiSelectMode || isCtrlClick) {
      setSelectedLinkIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(linkId)) {
          newSet.delete(linkId);
        } else {
          newSet.add(linkId);
        }
        return newSet;
      });
    } else {
      setSelectedLinkIds(new Set([linkId]));
    }
  }, [isMultiSelectMode]);

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = newLinkUrl.trim();
    if (!trimmedUrl) {
      console.log('No URL provided');
      return;
    }
    
    console.log('Adding link:', trimmedUrl);
    console.log('Stash ID:', stashId);
    console.log('Signature:', signature);
    
    try {
      addLinkMutation.mutate(trimmedUrl);
    } catch (error) {
      console.error('Error adding link:', error);
    }
  };

  const handleBatchDelete = () => {
    if (selectedLinkIds.size === 0) return;
    if (confirm(`Delete ${selectedLinkIds.size} selected links?`)) {
      batchDeleteMutation.mutate(Array.from(selectedLinkIds));
    }
  };

  const handleBatchOpen = () => {
    selectedLinks.forEach((link) => {
      window.open(link.url, '_blank');
    });
  };

  const handleBatchRefresh = () => {
    selectedLinkIds.forEach((linkId) => {
      refreshScreenshotMutation.mutate(linkId);
    });
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(filteredLinks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setLinks(items);
  };

  // Error handling
  if (stashError instanceof AxiosError && stashError.response?.status === 401) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">Invalid signature. Check your URL.</p>
          <a href="/" className="text-blue-600 hover:underline">Go back home</a>
        </div>
      </div>
    );
  }

  if (stashLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex overflow-hidden">
      {/* Left Column - 30% */}
      <div className="w-[30%] h-full flex flex-col border-r border-gray-200 bg-white">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900 truncate">{stash?.name}</h1>
          <p className="text-sm text-gray-500">{links.length} links</p>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-200">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search links..."
              className="w-full pl-9 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <svg
              className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-3 py-2 border-b border-gray-200 flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsAddingLink(true)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add
          </button>

          <button
            onClick={() => {
              setIsMultiSelectMode(!isMultiSelectMode);
              if (isMultiSelectMode) setSelectedLinkIds(new Set());
            }}
            className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${
              isMultiSelectMode
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            {isMultiSelectMode ? 'Done' : 'Select'}
          </button>

          {isMultiSelectMode && selectedLinkIds.size > 0 && (
            <>
              <span className="text-sm text-gray-500">{selectedLinkIds.size} selected</span>
              <button
                onClick={handleBatchOpen}
                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                title="Open in new tabs"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
              <button
                onClick={handleBatchRefresh}
                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                title="Refresh screenshots"
                disabled={refreshScreenshotMutation.isPending}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <button
                onClick={handleBatchDelete}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                title="Delete selected"
                disabled={batchDeleteMutation.isPending}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Add Link Form */}
        {isAddingLink && (
          <div className="p-3 border-b border-gray-200 bg-blue-50">
            <form onSubmit={handleAddLink} className="flex gap-2">
              <input
                type="text"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                type="submit"
                disabled={addLinkMutation.isPending}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingLink(false);
                  setNewLinkUrl('');
                }}
                className="px-3 py-2 text-gray-600 text-sm hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {/* Links List with Virtualization and Drag-Drop */}
        <div className="flex-1 overflow-hidden">
          {linksLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredLinks.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              {searchQuery ? 'No links match your search' : 'No links yet'}
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="links">
                {(provided: DroppableProvided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="h-full"
                  >
                    <List
                      listRef={listRef}
                      defaultHeight={window.innerHeight - 200}
                      rowCount={filteredLinks.length}
                      rowHeight={80}
                      rowComponent={Row}
                      rowProps={{
                        links: filteredLinks,
                        selectedLinkIds,
                        isMultiSelectMode,
                        onSelectLink: handleSelectLink
                      } as any}
                    />
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </div>

      {/* Right Column - 70% */}
      <div className="w-[70%] h-full bg-gray-100 overflow-hidden">
        {previewLink ? (
          <div className="h-full flex flex-col">
            {/* Preview Header */}
            <div className="bg-white border-b border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-gray-900 truncate">
                    {previewLink.title || previewLink.url}
                  </h2>
                  <a
                    href={previewLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline truncate block"
                  >
                    {previewLink.url}
                  </a>
                  {previewLink.description && (
                    <p className="text-sm text-gray-600 mt-2">{previewLink.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => window.open(previewLink.url, '_blank')}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Open in new tab"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                  <button
                    onClick={() => refreshScreenshotMutation.mutate(previewLink.id)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                    title="Refresh screenshot"
                    disabled={refreshScreenshotMutation.isPending}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this link?')) {
                        deleteLinkMutation.mutate(previewLink.id);
                      }
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete link"
                    disabled={deleteLinkMutation.isPending}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Screenshot Preview */}
            <div className="flex-1 p-4 overflow-auto">
              {previewLink.screenshotUrl ? (
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                  <img
                    src={previewLink.screenshotUrl}
                    alt={`Screenshot of ${previewLink.title || previewLink.url}`}
                    className="w-full h-auto"
                  />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-500">No screenshot yet</p>
                    <button
                      onClick={() => refreshScreenshotMutation.mutate(previewLink.id)}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      disabled={refreshScreenshotMutation.isPending}
                    >
                      {refreshScreenshotMutation.isPending ? 'Generating...' : 'Generate Screenshot'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <p className="text-lg font-medium">Select a link to preview</p>
              <p className="text-sm mt-1">
                {selectedLinks.length > 1
                  ? `${selectedLinks.length} links selected. Select only 1 to preview.`
                  : 'Click on a link in the list to view its screenshot'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
