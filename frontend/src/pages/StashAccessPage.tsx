import React, { useState, useMemo, useCallback, useEffect, forwardRef } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  DraggableProvidedDraggableProps,
  DraggableProvidedDragHandleProps,
} from '@hello-pangea/dnd';
import { stashApi, linkApi } from '../services/api';
import { Link as LinkType } from '../types';

// ─── Icons ───────────────────────────────────────────────────────────────────

const GripIcon = () => (
  <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
    <circle cx="3.5" cy="3" r="1.3" />
    <circle cx="3.5" cy="8" r="1.3" />
    <circle cx="3.5" cy="13" r="1.3" />
    <circle cx="8.5" cy="3" r="1.3" />
    <circle cx="8.5" cy="8" r="1.3" />
    <circle cx="8.5" cy="13" r="1.3" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getFaviconUrl = (url: string, provided?: string): string | null => {
  if (provided) return provided;
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return null;
  }
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en', { month: 'short', day: 'numeric' });

// ─── LinkItem ─────────────────────────────────────────────────────────────────

interface LinkItemProps {
  link: LinkType;
  isSelected: boolean;
  isActive: boolean;
  onItemClick: (id: string) => void;
  onCheckboxClick: (id: string) => void;
  draggableProps: DraggableProvidedDraggableProps;
  dragHandleProps: DraggableProvidedDragHandleProps | null;
  isDragging: boolean;
  isDragDisabled: boolean;
}

const LinkItem = forwardRef<HTMLDivElement, LinkItemProps>(
  (
    {
      link,
      isSelected,
      isActive,
      onItemClick,
      onCheckboxClick,
      draggableProps,
      dragHandleProps,
      isDragging,
      isDragDisabled,
    },
    ref
  ) => {
    const [hovered, setHovered] = useState(false);
    const showCheckbox = hovered || isSelected;
    const faviconUrl = getFaviconUrl(link.url, link.faviconUrl);

    return (
      <div
        ref={ref}
        {...draggableProps}
        className={[
          'relative flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none',
          'border-b border-slate-800/50 transition-colors duration-100',
          isDragging
            ? 'bg-slate-700 shadow-2xl rounded-lg'
            : isActive
            ? 'bg-indigo-500/20 border-l-2 border-l-indigo-400'
            : isSelected
            ? 'bg-indigo-500/10'
            : hovered
            ? 'bg-white/[0.04]'
            : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => onItemClick(link.id)}
      >
        {/* Drag handle */}
        {!isDragDisabled && dragHandleProps && (
          <div
            {...dragHandleProps}
            className={`flex-shrink-0 text-slate-600 hover:text-slate-400 transition-opacity cursor-grab active:cursor-grabbing ${
              hovered ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <GripIcon />
          </div>
        )}

        {/* Checkbox */}
        <div
          className={`flex-shrink-0 transition-opacity ${showCheckbox ? 'opacity-100' : 'opacity-0'}`}
          onClick={(e) => {
            e.stopPropagation();
            onCheckboxClick(link.id);
          }}
        >
          <div
            className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center transition-all ${
              isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600 hover:border-slate-400'
            }`}
          >
            {isSelected && <CheckIcon />}
          </div>
        </div>

        {/* Favicon */}
        <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
          {faviconUrl ? (
            <img
              src={faviconUrl}
              alt=""
              className="w-4 h-4 rounded-sm object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-3 h-3 bg-slate-700 rounded-sm" />
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-slate-200 truncate leading-tight">
            {link.title || link.url}
          </p>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">{link.url}</p>
        </div>

        {/* Meta */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          <span className="text-[11px] text-slate-600">{formatDate(link.createdAt)}</span>
          {link.screenshotUrl && (
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" title="Screenshot available" />
          )}
        </div>
      </div>
    );
  }
);

LinkItem.displayName = 'LinkItem';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StashAccessPage() {
  const { stashId, signature } = useParams<{ stashId: string; signature: string }>();
  const [selectedLinkIds, setSelectedLinkIds] = useState<Set<string>>(new Set());
  const [activeLinkId, setActiveLinkId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [links, setLinks] = useState<LinkType[]>([]);
  const queryClient = useQueryClient();

  if (!stashId || !signature) {
    return <Navigate to="/" replace />;
  }

  const { data: stash, isLoading: stashLoading, error: stashError } = useQuery({
    queryKey: ['stash', stashId],
    queryFn: async () => {
      const res = await stashApi.getStash(stashId, signature);
      return res.data;
    },
    enabled: !!stashId && !!signature,
  });

  const { data: linksData, isLoading: linksLoading } = useQuery({
    queryKey: ['links', stashId, debouncedSearch],
    queryFn: async () => {
      const res = await linkApi.listLinks(stashId, signature, debouncedSearch || undefined, 0, 100);
      return res.data;
    },
    enabled: !!stashId && !!signature,
  });

  useEffect(() => {
    if (linksData) {
      const arr = Array.isArray(linksData) ? linksData : linksData.content;
      if (Array.isArray(arr)) setLinks(arr);
    }
  }, [linksData]);

  // Clear active link if it was deleted
  useEffect(() => {
    if (activeLinkId && !links.find((l) => l.id === activeLinkId)) {
      setActiveLinkId(null);
    }
  }, [links, activeLinkId]);

  // Debounce search query to avoid an API call on every keypress
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  const activeLink = useMemo(
    () => (activeLinkId ? links.find((l) => l.id === activeLinkId) ?? null : null),
    [links, activeLinkId]
  );

  const selectedLinks = useMemo(
    () => links.filter((l) => selectedLinkIds.has(l.id)),
    [links, selectedLinkIds]
  );

  // ─── Mutations ───────────────────────────────────────────────────────────────

  const addLinkMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await linkApi.addLink(stashId!, signature!, { url });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', stashId] });
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
      queryClient.invalidateQueries({ queryKey: ['links', stashId] });
      setSelectedLinkIds(new Set());
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => linkApi.deleteLink(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', stashId] });
      setSelectedLinkIds(new Set());
    },
  });

  const refreshScreenshotMutation = useMutation({
    mutationFn: (linkId: string) => linkApi.refreshScreenshot(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', stashId] });
    },
  });

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleItemClick = useCallback((linkId: string) => {
    setActiveLinkId(linkId);
    setSelectedLinkIds(new Set([linkId]));
  }, []);

  const handleCheckboxClick = useCallback((linkId: string) => {
    setSelectedLinkIds((prev) => {
      const next = new Set(prev);
      if (next.has(linkId)) {
        next.delete(linkId);
      } else {
        next.add(linkId);
      }
      return next;
    });
  }, []);

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    const url = newLinkUrl.trim();
    if (url) addLinkMutation.mutate(url);
  };

  const handleBatchDelete = () => {
    if (!selectedLinkIds.size) return;
    if (confirm(`Delete ${selectedLinkIds.size} selected link${selectedLinkIds.size > 1 ? 's' : ''}?`)) {
      batchDeleteMutation.mutate(Array.from(selectedLinkIds));
    }
  };

  const handleBatchOpen = () => {
    selectedLinks.forEach((l) => window.open(l.url, '_blank'));
  };

  const handleBatchRefresh = () => {
    selectedLinkIds.forEach((id) => refreshScreenshotMutation.mutate(id));
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || isSearching) return;
    const items = Array.from(links);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setLinks(items);
  };

  // ─── Error / Loading states ───────────────────────────────────────────────────

  if (stashError instanceof AxiosError && stashError.response?.status === 401) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Access Denied</h2>
          <p className="text-slate-400 text-sm mb-6">Invalid or expired signature. Check your URL.</p>
          <a href="/" className="text-indigo-400 hover:text-indigo-300 text-sm">
            ← Go back home
          </a>
        </div>
      </div>
    );
  }

  if (stashLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading pouch…</p>
        </div>
      </div>
    );
  }

  // ─── Main layout ─────────────────────────────────────────────────────────────

  return (
    <div className="h-full w-full flex overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 h-full flex flex-col bg-slate-950 border-r border-slate-800">
        {/* Pouch header */}
        <div className="px-4 pt-3 pb-3 border-b border-slate-800/70">
          <a
            href="/"
            className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-400 transition-colors mb-2"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Home
          </a>
          <h1 className="text-sm font-semibold text-slate-100 truncate">{stash?.name}</h1>
          <p className="text-xs text-slate-600 mt-0.5">{links.length} links</p>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 border-b border-slate-800/70">
          <div className="relative">
            <svg
              className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500 pointer-events-none"
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
              className="w-full pl-8 pr-3 py-2 bg-slate-800/60 border border-slate-700/70 rounded-lg text-[13px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Add link */}
        <form onSubmit={handleAddLink} className="px-3 py-2.5 border-b border-slate-800/70">
          <div className="flex gap-2">
            <input
              type="text"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              placeholder="https://…"
              className="flex-1 min-w-0 px-3 py-1.5 bg-slate-800/60 border border-slate-700/70 rounded-lg text-[13px] text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/20"
            />
            <button
              type="submit"
              disabled={addLinkMutation.isPending || !newLinkUrl.trim()}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              {addLinkMutation.isPending ? '…' : 'Add'}
            </button>
          </div>
        </form>

        {/* Selection actions bar */}
        {selectedLinkIds.size > 1 && (
          <div className="px-3 py-2 border-b border-slate-800/70 bg-slate-900/60 flex items-center gap-1.5">
            <span className="text-[12px] text-slate-400 flex-1 font-medium">
              {selectedLinkIds.size} selected
            </span>
            <button
              onClick={handleBatchOpen}
              title="Open all in new tabs"
              className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
            <button
              onClick={handleBatchRefresh}
              disabled={refreshScreenshotMutation.isPending}
              title="Refresh screenshots"
              className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors disabled:opacity-30"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={handleBatchDelete}
              disabled={batchDeleteMutation.isPending}
              title="Delete selected"
              className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors disabled:opacity-30"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <button
              onClick={() => setSelectedLinkIds(new Set())}
              title="Clear selection"
              className="p-1.5 text-slate-600 hover:text-slate-300 hover:bg-slate-700 rounded transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Link list */}
        <div className="flex-1 overflow-hidden">
          {linksLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : links.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 pb-8">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <p className="text-slate-500 text-sm">
                {isSearching ? 'No links match your search' : 'No links yet — paste one above'}
              </p>
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="links">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="h-full overflow-y-auto"
                  >
                    {links.map((link, index) => (
                      <Draggable
                        key={link.id}
                        draggableId={link.id}
                        index={index}
                        isDragDisabled={isSearching}
                      >
                        {(dragProvided, dragSnapshot) => (
                          <LinkItem
                            ref={dragProvided.innerRef}
                            draggableProps={dragProvided.draggableProps}
                            dragHandleProps={dragProvided.dragHandleProps}
                            isDragging={dragSnapshot.isDragging}
                            isDragDisabled={isSearching}
                            link={link}
                            isSelected={selectedLinkIds.has(link.id)}
                            isActive={link.id === activeLinkId}
                            onItemClick={handleItemClick}
                            onCheckboxClick={handleCheckboxClick}
                          />
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>

        {/* Search + drag notice */}
        {isSearching && links.length > 0 && (
          <div className="px-3 py-2 border-t border-slate-800/70 text-[11px] text-slate-700 text-center">
            Drag reordering disabled during search
          </div>
        )}
      </div>

      {/* ── Preview panel ────────────────────────────────────────────────────── */}
      <div className="flex-1 h-full flex flex-col overflow-hidden bg-slate-50">
        {activeLink ? (
          <>
            {/* Header */}
            <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {activeLink.faviconUrl && (
                      <img src={activeLink.faviconUrl} alt="" className="w-4 h-4 rounded-sm flex-shrink-0" />
                    )}
                    <h2 className="text-[15px] font-semibold text-slate-900 truncate">
                      {activeLink.title || activeLink.url}
                    </h2>
                  </div>
                  <a
                    href={activeLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13px] text-indigo-600 hover:text-indigo-800 truncate block"
                  >
                    {activeLink.url}
                  </a>
                  {activeLink.description && (
                    <p className="text-[13px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                      {activeLink.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => window.open(activeLink.url, '_blank')}
                    title="Open in new tab"
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                  <button
                    onClick={() => refreshScreenshotMutation.mutate(activeLink.id)}
                    title="Refresh screenshot"
                    disabled={refreshScreenshotMutation.isPending}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
                  >
                    <svg
                      className={`w-4 h-4 ${refreshScreenshotMutation.isPending ? 'animate-spin' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this link?')) {
                        deleteLinkMutation.mutate(activeLink.id);
                      }
                    }}
                    title="Delete link"
                    disabled={deleteLinkMutation.isPending}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Screenshot */}
            <div className="flex-1 overflow-auto p-6">
              {activeLink.screenshotUrl ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <img
                    src={activeLink.screenshotUrl}
                    alt={`Screenshot of ${activeLink.title || activeLink.url}`}
                    className="w-full h-auto block"
                  />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-slate-500 mb-4 text-sm">No screenshot yet</p>
                    <button
                      onClick={() => refreshScreenshotMutation.mutate(activeLink.id)}
                      disabled={refreshScreenshotMutation.isPending}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm transition-colors disabled:opacity-50 font-medium"
                    >
                      {refreshScreenshotMutation.isPending ? 'Generating…' : 'Generate Screenshot'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-xs px-6">
              {selectedLinkIds.size > 1 ? (
                <>
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-slate-700 font-semibold">{selectedLinkIds.size} links selected</p>
                  <p className="text-slate-400 text-sm mt-1">Use the actions in the sidebar to manage them</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
                    </svg>
                  </div>
                  <p className="text-slate-600 font-semibold">Select a link to preview</p>
                  <p className="text-slate-400 text-sm mt-1">Click any link in the sidebar to see its screenshot here</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
