import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { stashApi, linkApi, utilsApi } from '../services/api';
import { Link as LinkType } from '../types';
import { useStashSearch } from '../contexts/stashSearch';
import { ArchiveSnapshotPicker } from '../components/ArchiveSnapshotPicker';

// ─── Types ────────────────────────────────────────────────────────────────────

type PreviewMode = 'live' | 'archive';

// ─── Icons ───────────────────────────────────────────────────────────────────

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

// ─── Drag Preview Overlay ─────────────────────────────────────────────────────

function DragPreview({ links }: { links: LinkType[] }) {
  const visible = links.slice(0, 3);
  const extra = links.length - visible.length;
  return (
    <div
      className="rounded-xl border border-slate-600 bg-slate-800 shadow-2xl overflow-hidden cursor-grabbing"
      style={{ width: 272, opacity: 0.97 }}
    >
      {visible.map((link, i) => {
        const favicon = getFaviconUrl(link.url, link.faviconUrl);
        return (
          <div
            key={link.id}
            className={`flex items-center gap-2 px-3 py-2.5 ${i > 0 ? 'border-t border-slate-700/50' : ''}`}
          >
            <div className="w-4 h-4 rounded border-[1.5px] bg-indigo-500 border-indigo-500 flex items-center justify-center flex-shrink-0">
              <CheckIcon />
            </div>
            <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
              {favicon ? (
                <img
                  src={favicon}
                  alt=""
                  className="w-4 h-4 rounded-sm object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-3 h-3 bg-slate-600 rounded-sm" />
              )}
            </div>
            <p className="text-[13px] text-slate-200 truncate flex-1 leading-tight">
              {link.title || link.url}
            </p>
          </div>
        );
      })}
      {extra > 0 && (
        <div className="px-3 py-1.5 border-t border-slate-700/50 bg-slate-900/40">
          <p className="text-[11px] text-slate-500">
            +{extra} more link{extra !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── LinkItem ─────────────────────────────────────────────────────────────────

interface LinkItemProps {
  link: LinkType;
  isSelected: boolean;
  isActive: boolean;
  onItemClick: (id: string) => void;
  onCheckboxClick: (id: string) => void;
  isDragDisabled: boolean;
  isGroupDragging: boolean;
}

const LinkItem = ({
  link,
  isSelected,
  isActive,
  onItemClick,
  onCheckboxClick,
  isDragDisabled,
  isGroupDragging,
}: LinkItemProps) => {
  const [hovered, setHovered] = useState(false);
  const showCheckbox = hovered || isSelected;
  const faviconUrl = getFaviconUrl(link.url, link.faviconUrl);

  return (
    <div
      className={[
        'relative flex items-center gap-2 px-3 py-2.5 select-none',
        isDragDisabled ? 'cursor-pointer' : 'cursor-grab',
        'border-b border-slate-800/50 transition-colors duration-100',
        isGroupDragging
          ? 'bg-indigo-500/10'
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
            isSelected
              ? 'bg-indigo-500 border-indigo-500'
              : 'border-slate-600 hover:border-slate-400'
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
        <div className="flex items-center gap-1 mt-0.5 min-w-0">
          <p className="text-[11px] text-slate-500 truncate">{link.url}</p>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new tab"
            onClick={(e) => e.stopPropagation()}
            className={`flex-shrink-0 text-slate-600 hover:text-slate-300 transition-opacity transition-colors ${hovered ? 'opacity-100' : 'opacity-0'}`}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
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
};

// ─── SortableLinkItem ─────────────────────────────────────────────────────────

interface SortableLinkItemProps {
  link: LinkType;
  isSelected: boolean;
  activeLinkId: string | null;
  draggingId: string | null;
  isSearching: boolean;
  onItemClick: (id: string) => void;
  onCheckboxClick: (id: string) => void;
}

const SortableLinkItem = ({
  link,
  isSelected,
  activeLinkId,
  draggingId,
  isSearching,
  onItemClick,
  onCheckboxClick,
}: SortableLinkItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: link.id,
    disabled: isSearching,
  });

  // isDragging = this item is the primary dragged item (hidden; DragOverlay shows it)
  // isGroupDragging = another selected item is being dragged (this one dims to show it's moving)
  const isGroupDragging = !isDragging && draggingId !== null && isSelected;

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : isGroupDragging ? 0.35 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <LinkItem
        link={link}
        isSelected={isSelected}
        isActive={link.id === activeLinkId}
        isDragDisabled={isSearching}
        isGroupDragging={isGroupDragging}
        onItemClick={onItemClick}
        onCheckboxClick={onCheckboxClick}
      />
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StashAccessPage() {
  const { stashId, signature } = useParams<{ stashId: string; signature: string }>();
  const [selectedLinkIds, setSelectedLinkIds] = useState<Set<string>>(new Set());
  const [activeLinkId, setActiveLinkId] = useState<string | null>(null);
  const { searchQuery } = useStashSearch();
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [links, setLinks] = useState<LinkType[]>([]);
  const [screenshotModalOpen, setScreenshotModalOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('live');
  const [liveLoading, setLiveLoading] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [showArchiveSuggestion, setShowArchiveSuggestion] = useState(false);
  const [liveFailed, setLiveFailed] = useState(false);
  const [selectedArchiveTimestamp, setSelectedArchiveTimestamp] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const liveIframeRef = useRef<HTMLIFrameElement>(null);
  const blockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  if (!stashId || !signature) {
    return <Navigate to="/" replace />;
  }

  const { isLoading: stashLoading, error: stashError } = useQuery({
    queryKey: ['stash', stashId],
    queryFn: async () => {
      const res = await stashApi.getStash(stashId, signature);
      return res.data;
    },
    enabled: !!stashId && !!signature,
  });

  const {
    data: linksData,
    isLoading: linksLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['links', stashId, debouncedSearch],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await linkApi.listLinks(
        stashId,
        signature,
        debouncedSearch || undefined,
        pageParam as number,
        20
      );
      return res.data;
    },
    getNextPageParam: (lastPage) => {
      const currentPage = lastPage.number ?? 0;
      const totalPages = lastPage.totalPages ?? 1;
      return currentPage + 1 < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 0,
    enabled: !!stashId && !!signature,
  });

  // Flatten all pages into the local links array
  useEffect(() => {
    if (linksData) {
      const allLinks = linksData.pages.flatMap((page) => page.content ?? []);
      setLinks(allLinks);
    }
  }, [linksData]);

  // Clear active link if it was deleted
  useEffect(() => {
    if (activeLinkId && !links.find((l) => l.id === activeLinkId)) {
      setActiveLinkId(null);
    }
  }, [links, activeLinkId]);

  // Reset preview state when a different link is selected
  useEffect(() => {
    setScreenshotModalOpen(false);
    setPreviewMode('live');
    setLiveLoading(true);
    setArchiveLoading(false);
    setShowArchiveSuggestion(false);
    setLiveFailed(false);
    setSelectedArchiveTimestamp(null);
    if (blockTimerRef.current) clearTimeout(blockTimerRef.current);
    if (activeLinkId) {
      blockTimerRef.current = setTimeout(() => setShowArchiveSuggestion(true), 6000);
    }
    return () => {
      if (blockTimerRef.current) {
        clearTimeout(blockTimerRef.current);
        blockTimerRef.current = null;
      }
    };
  }, [activeLinkId]);


  const activeLink = useMemo(
    () => (activeLinkId ? links.find((l) => l.id === activeLinkId) ?? null : null),
    [links, activeLinkId]
  );

  // Server-side embeddability check — fires in parallel with the live iframe load.
  // Switches to archive mode immediately when the backend reports that the site
  // blocks embedding, without relying on flaky client-side timing heuristics.
  useEffect(() => {
    if (!activeLink) return;
    let cancelled = false;
    utilsApi
      .checkEmbeddable(activeLink.url)
      .then(({ data }) => {
        if (cancelled) return;
        if (!data.embeddable) {
          setLiveFailed(true);
          setPreviewMode('archive');
          setArchiveLoading(true);
          setShowArchiveSuggestion(false);
          setLiveLoading(false);
        }
      })
      .catch(() => {
        // Network error or SSRF rejection — fall back to live iframe attempt
      });
    return () => {
      cancelled = true;
    };
  }, [activeLink]);

  // Debounce search query to avoid an API call on every keypress
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Infinite scroll: observe the sentinel against the viewport (root: null).
  // The viewport correctly respects overflow-y clipping on the scroll container —
  // the sentinel is hidden when scrolled out of view and visible when scrolled into view.
  // When the initial page doesn't fill the container there is no clipping, so the
  // sentinel is immediately visible and triggers the next page automatically.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '100px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, links.length]);

  const isSearching = searchQuery.trim().length > 0;

  const selectedLinks = useMemo(
    () => links.filter((l) => selectedLinkIds.has(l.id)),
    [links, selectedLinkIds]
  );

  // ─── Drag & Drop ──────────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const activeId = event.active.id as string;
      setDraggingId(activeId);
      // If dragging an item not in the current selection, select only that item
      if (!selectedLinkIds.has(activeId)) {
        setSelectedLinkIds(new Set([activeId]));
        setActiveLinkId(activeId);
      }
    },
    [selectedLinkIds]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setDraggingId(null);
      const { active, over } = event;
      if (!over || isSearching) return;

      const activeId = active.id as string;
      const overId = over.id as string;
      const activeIdx = links.findIndex((l) => l.id === activeId);
      const overIdx = links.findIndex((l) => l.id === overId);

      if (selectedLinkIds.size <= 1) {
        // Single item drag
        if (activeIdx === overIdx) return;
        const newLinks = arrayMove(links, activeIdx, overIdx);
        setLinks(newLinks);
        const insertAfterId = overIdx > 0 ? newLinks[overIdx - 1].id : null;
        linkApi.reorderLinks(stashId!, signature!, [activeId], insertAfterId);
      } else {
        // Multi-item drag — move entire selection group
        const selected = links.filter((l) => selectedLinkIds.has(l.id));
        const unselected = links.filter((l) => !selectedLinkIds.has(l.id));
        const isMovingDown = activeIdx < overIdx;

        const insertAt = unselected.filter((l) => {
          const origIdx = links.indexOf(l);
          return isMovingDown ? origIdx <= overIdx : origIdx < overIdx;
        }).length;

        const newOrder = [
          ...unselected.slice(0, insertAt),
          ...selected,
          ...unselected.slice(insertAt),
        ];
        setLinks(newOrder);

        const insertAfterId = insertAt > 0 ? unselected[insertAt - 1].id : null;
        linkApi.reorderLinks(
          stashId!,
          signature!,
          selected.map((l) => l.id),
          insertAfterId
        );
      }
    },
    [links, selectedLinkIds, isSearching, stashId, signature]
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
    if (
      confirm(
        `Delete ${selectedLinkIds.size} selected link${selectedLinkIds.size > 1 ? 's' : ''}?`
      )
    ) {
      batchDeleteMutation.mutate(Array.from(selectedLinkIds));
    }
  };

  const handleBatchRefresh = () => {
    selectedLinkIds.forEach((id) => refreshScreenshotMutation.mutate(id));
  };

  const handleLiveLoad = useCallback(() => {
    if (blockTimerRef.current) {
      clearTimeout(blockTimerRef.current);
      blockTimerRef.current = null;
    }
    setLiveLoading(false);
  }, []);

  const switchToArchive = useCallback(() => {
    if (blockTimerRef.current) {
      clearTimeout(blockTimerRef.current);
      blockTimerRef.current = null;
    }
    setPreviewMode('archive');
    setArchiveLoading(true);
    setShowArchiveSuggestion(false);
  }, []);

  const switchToLive = useCallback(() => {
    if (blockTimerRef.current) {
      clearTimeout(blockTimerRef.current);
      blockTimerRef.current = null;
    }
    setPreviewMode('live');
    setLiveLoading(true);
    setShowArchiveSuggestion(false);
    blockTimerRef.current = setTimeout(() => setShowArchiveSuggestion(true), 6000);
  }, []);

  // ─── Error / Loading states ───────────────────────────────────────────────────

  if (stashError instanceof AxiosError && stashError.response?.status === 401) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Access Denied</h2>
          <p className="text-slate-400 text-sm mb-6">
            Invalid or expired signature. Check your URL.
          </p>
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
        {selectedLinkIds.size > 0 && (
          <div className="px-3 py-2 border-b border-slate-800/70 bg-slate-900/60 flex items-center gap-1.5">
            <span className="text-[12px] text-slate-400 flex-1 font-medium">
              {selectedLinkIds.size} selected
            </span>
            <button
              onClick={handleBatchRefresh}
              disabled={refreshScreenshotMutation.isPending}
              title="Refresh screenshots"
              className="p-1.5 text-slate-500 hover:text-slate-200 hover:bg-slate-700 rounded transition-colors disabled:opacity-30"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <button
              onClick={handleBatchDelete}
              disabled={batchDeleteMutation.isPending}
              title="Delete selected"
              className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors disabled:opacity-30"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
            <button
              onClick={() => setSelectedLinkIds(new Set())}
              title="Clear selection"
              className="p-1.5 text-slate-600 hover:text-slate-300 hover:bg-slate-700 rounded transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Link list — flex-1 + min-h-0 constrains height so overflow-y-auto actually scrolls */}
        <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto">
          {linksLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : links.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 pb-8">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mb-3">
                <svg
                  className="w-6 h-6 text-slate-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
              </div>
              <p className="text-slate-500 text-sm">
                {isSearching ? 'No links match your search' : 'No links yet — paste one above'}
              </p>
            </div>
          ) : (
            <>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={links.map((l) => l.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {links.map((link) => (
                    <SortableLinkItem
                      key={link.id}
                      link={link}
                      isSelected={selectedLinkIds.has(link.id)}
                      activeLinkId={activeLinkId}
                      draggingId={draggingId}
                      isSearching={isSearching}
                      onItemClick={handleItemClick}
                      onCheckboxClick={handleCheckboxClick}
                    />
                  ))}
                </SortableContext>
                {/* DragOverlay renders as a portal; restrictToParentElement keeps it inside the sidebar */}
                <DragOverlay dropAnimation={null}>
                  {draggingId ? <DragPreview links={selectedLinks} /> : null}
                </DragOverlay>
              </DndContext>
              {/* Sentinel observed by IntersectionObserver against the viewport */}
              <div ref={sentinelRef} className="h-px" />
              {isFetchingNextPage && (
                <div className="flex items-center justify-center py-3">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </>
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
                      <img
                        src={activeLink.faviconUrl}
                        alt=""
                        className="w-4 h-4 rounded-sm flex-shrink-0"
                      />
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

                  {/* Preview controls */}
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <div className="flex rounded-lg overflow-hidden border border-slate-200 text-[12px] font-medium flex-shrink-0">
                      <button
                        onClick={switchToLive}
                        disabled={liveFailed}
                        className={`px-3 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          previewMode === 'live'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        Live
                      </button>
                      <button
                        onClick={switchToArchive}
                        className={`px-3 py-1 border-l border-slate-200 transition-colors ${
                          previewMode === 'archive'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        Archive
                      </button>
                    </div>

                    {previewMode === 'archive' && (
                      <ArchiveSnapshotPicker
                        url={activeLink.url}
                        selectedTimestamp={selectedArchiveTimestamp}
                        onSelect={(ts) => {
                          setSelectedArchiveTimestamp(ts);
                          setArchiveLoading(true);
                        }}
                      />
                    )}

                    {showArchiveSuggestion && previewMode === 'live' && (
                      <div className="flex items-center gap-1.5 text-[12px]">
                        <svg
                          className="w-3.5 h-3.5 text-amber-500 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                        <span className="text-slate-500">Page may not be loading.</span>
                        <button
                          onClick={switchToArchive}
                          className="text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                          View in archive.org →
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Screenshot thumbnail */}
                <div className="flex-shrink-0">
                  {activeLink.screenshotUrl ? (
                    <button
                      onClick={() => setScreenshotModalOpen(true)}
                      className="w-24 h-16 rounded-lg overflow-hidden border border-slate-200 hover:border-indigo-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      title="View screenshot"
                    >
                      <img
                        src={activeLink.screenshotUrl}
                        alt="Screenshot thumbnail"
                        className="w-full h-full object-cover object-top"
                      />
                    </button>
                  ) : (
                    <div className="w-24 h-16 rounded-lg border border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-1">
                      <svg
                        className="w-5 h-5 text-slate-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <button
                        onClick={() => refreshScreenshotMutation.mutate(activeLink.id)}
                        disabled={refreshScreenshotMutation.isPending}
                        className="text-[10px] text-indigo-500 hover:text-indigo-700 disabled:opacity-50"
                      >
                        {refreshScreenshotMutation.isPending ? 'Generating…' : 'Generate'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* iframe area */}
            <div className="flex-1 overflow-hidden relative">
              {previewMode === 'live' ? (
                <>
                  {liveLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10">
                      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-slate-500 text-sm mt-3">Loading website…</p>
                    </div>
                  )}
                  <iframe
                    ref={liveIframeRef}
                    key={`live-${activeLink.id}`}
                    src={activeLink.url}
                    title={`Live preview: ${activeLink.title || activeLink.url}`}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                    onLoad={handleLiveLoad}
                  />
                </>
              ) : (
                <>
                  {archiveLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10">
                      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      {liveFailed && (
                        <p className="text-amber-600 text-xs mt-3">
                          Live preview couldn't load — switching to archive
                        </p>
                      )}
                      <p className={`text-slate-500 text-sm ${liveFailed ? 'mt-1' : 'mt-3'}`}>
                        Loading archive…
                      </p>
                      <a
                        href="https://archive.org"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-400 hover:text-indigo-500 transition-colors mt-1"
                      >
                        Powered by archive.org
                      </a>
                    </div>
                  )}
                  <iframe
                    key={`archive-${activeLink.id}-${selectedArchiveTimestamp ?? 'latest'}`}
                    src={
                      selectedArchiveTimestamp
                        ? `https://web.archive.org/web/${selectedArchiveTimestamp}/${activeLink.url}`
                        : `https://web.archive.org/web/${activeLink.url}`
                    }
                    title={`Archived page: ${activeLink.title || activeLink.url}`}
                    className="w-full h-full border-0"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                    onLoad={() => setArchiveLoading(false)}
                  />
                </>
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
                    <svg
                      className="w-8 h-8 text-indigo-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <p className="text-slate-700 font-semibold">
                    {selectedLinkIds.size} links selected
                  </p>
                  <p className="text-slate-400 text-sm mt-1">
                    Use the actions in the sidebar to manage them
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-slate-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"
                      />
                    </svg>
                  </div>
                  <p className="text-slate-600 font-semibold">Select a link to preview</p>
                  <p className="text-slate-400 text-sm mt-1">
                    Click any link in the sidebar to see its screenshot here
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Screenshot modal */}
        {screenshotModalOpen && activeLink?.screenshotUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setScreenshotModalOpen(false)}
          >
            <button
              onClick={() => setScreenshotModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <div className="max-w-5xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
              <img
                src={activeLink.screenshotUrl}
                alt={`Screenshot of ${activeLink.title || activeLink.url}`}
                className="w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
