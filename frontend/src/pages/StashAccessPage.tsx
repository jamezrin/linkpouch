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
import { useStashEvents } from '../hooks/useStashEvents';

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

function validateUrl(url: string): string | null {
  if (!url) return 'URL is required';
  if (!url.startsWith('http://') && !url.startsWith('https://'))
    return 'URL must start with http:// or https://';
  if (url.length > 2048) return 'URL is too long (max 2048 characters)';
  try {
    new URL(url);
  } catch {
    return 'Please enter a valid URL';
  }
  return null;
}

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
  index: number;
  onItemClick: (id: string) => void;
  onCheckboxClick: (id: string, index: number, shiftKey: boolean) => void;
  isDragDisabled: boolean;
  isGroupDragging: boolean;
}

const LinkItem = ({
  link,
  isSelected,
  isActive,
  index,
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
      role="option"
      aria-selected={isSelected}
      className={[
        'relative flex items-center gap-2 px-3 py-2.5 select-none',
        isDragDisabled ? 'cursor-pointer' : 'cursor-grab',
        'border-b border-slate-200/50 dark:border-slate-800/50 transition-colors duration-100',
        isGroupDragging
          ? 'bg-indigo-500/10'
          : isActive
          ? 'bg-indigo-500/20 border-l-2 border-l-indigo-400'
          : isSelected
          ? 'bg-indigo-500/10'
          : hovered
          ? 'bg-slate-100 dark:bg-white/[0.04]'
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
        role="checkbox"
        aria-checked={isSelected}
        aria-label={isSelected ? 'Deselect link' : 'Select link'}
        tabIndex={-1}
        className={`flex-shrink-0 transition-opacity ${showCheckbox ? 'opacity-100' : 'opacity-0'}`}
        onClick={(e) => {
          e.stopPropagation();
          onCheckboxClick(link.id, index, e.shiftKey);
        }}
      >
        <div
          className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-indigo-500 border-indigo-500'
              : 'border-slate-300 dark:border-slate-600 hover:border-slate-500 dark:hover:border-slate-400'
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
          <div className="w-3 h-3 bg-slate-300 dark:bg-slate-700 rounded-sm" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-medium truncate leading-tight ${
          !link.status || link.status === 'PENDING'
            ? 'text-slate-400 italic'
            : 'text-slate-800 dark:text-slate-200'
        }`}>
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
            className={`flex-shrink-0 text-slate-400 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-300 transition-opacity transition-colors ${hovered ? 'opacity-100' : 'opacity-0'}`}
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
        <span className="text-[11px] text-slate-500 dark:text-slate-600">{formatDate(link.createdAt)}</span>
        {link.status === 'FAILED' ? (
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full" title="Indexing failed" />
        ) : link.status === 'INDEXED' ? (
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" title="Indexed" />
        ) : (
          <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" title="Indexing…" />
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
  index: number;
  onItemClick: (id: string) => void;
  onCheckboxClick: (id: string, index: number, shiftKey: boolean) => void;
}

const SortableLinkItem = ({
  link,
  isSelected,
  activeLinkId,
  draggingId,
  isSearching,
  index,
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
        index={index}
        isDragDisabled={isSearching}
        isGroupDragging={isGroupDragging}
        onItemClick={onItemClick}
        onCheckboxClick={onCheckboxClick}
      />
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

function getSessionSignature(stashId: string): string | null {
  try {
    return sessionStorage.getItem(`sig:${stashId}`);
  } catch {
    return null;
  }
}

export default function StashAccessPage() {
  const { stashId, signature: urlSignature } = useParams<{ stashId: string; signature?: string }>();
  const signature = urlSignature ?? (stashId ? getSessionSignature(stashId) : null);
  const [selectedLinkIds, setSelectedLinkIds] = useState<Set<string>>(new Set());
  const [activeLinkId, setActiveLinkId] = useState<string | null>(null);
  const [lastCheckedIndex, setLastCheckedIndex] = useState<number | null>(null);
  const [selectingAll, setSelectingAll] = useState(false);
  const { searchQuery } = useStashSearch();
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [links, setLinks] = useState<LinkType[]>([]);
  const [screenshotModalOpen, setScreenshotModalOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('live');
  const [liveLoading, setLiveLoading] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [showArchiveSuggestion, setShowArchiveSuggestion] = useState(false);
  const [liveFailed, setLiveFailed] = useState(false);
  const [selectedArchiveTimestamp, setSelectedArchiveTimestamp] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [screenshotBlobUrl, setScreenshotBlobUrl] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const liveIframeRef = useRef<HTMLIFrameElement>(null);
  const blockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  if (!stashId || !signature) {
    return <Navigate to="/" replace />;
  }

  // ─── SSE: real-time link updates ─────────────────────────────────────────────

  useStashEvents({
    stashId,
    signature,
    onLinkUpdated: (updatedLink) => {
      // Update the link in-place inside all pages of the infinite query cache
      queryClient.setQueryData(
        ['links', stashId, debouncedSearch],
        (old: { pages: { content: LinkType[] }[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              content: page.content.map((l) =>
                l.id === updatedLink.id ? { ...l, ...updatedLink } : l
              ),
            })),
          };
        }
      );
      // Also mirror the update into the local links state so the sidebar re-renders
      setLinks((prev) => prev.map((l) => (l.id === updatedLink.id ? { ...l, ...updatedLink } : l)));
    },
  });

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

  // Fetch screenshot via authenticated header — <img> tags cannot send custom headers,
  // so we use fetch() with X-Stash-Signature and create a blob URL for the <img> src.
  useEffect(() => {
    const screenshotUrl = activeLink?.screenshotUrl;
    if (!screenshotUrl || !signature) {
      setScreenshotBlobUrl(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    fetch(screenshotUrl, {
      headers: { 'X-Stash-Signature': signature },
    })
      .then(res => {
        if (!res.ok) throw new Error(`Screenshot fetch failed: ${res.status}`);
        return res.blob();
      })
      .then(blob => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setScreenshotBlobUrl(objectUrl);
      })
      .catch(err => {
        if (!cancelled) {
          console.error('Failed to load screenshot:', err);
          setScreenshotBlobUrl(null);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        setScreenshotBlobUrl(null);
      }
    };
  }, [activeLink?.screenshotUrl, signature]);

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

  // Reset selection when search changes
  useEffect(() => {
    setSelectedLinkIds(new Set());
    setLastCheckedIndex(null);
  }, [debouncedSearch]);

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

  // Select-all: eagerly fetch all remaining pages, then select everything
  useEffect(() => {
    if (!selectingAll) return;
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    } else if (!hasNextPage) {
      setSelectedLinkIds(new Set(links.map((l) => l.id)));
      setSelectingAll(false);
    }
  }, [selectingAll, hasNextPage, isFetchingNextPage, fetchNextPage, links]);

  const isSearching = searchQuery.trim().length > 0;

  const selectedLinks = useMemo(
    () => links.filter((l) => selectedLinkIds.has(l.id)),
    [links, selectedLinkIds]
  );

  // Derived selection state
  const allVisibleSelected = links.length > 0 && links.every((l) => selectedLinkIds.has(l.id));
  const someSelected = selectedLinkIds.size > 0 && !allVisibleSelected;
  const totalElements: number | null = linksData?.pages[0]?.totalElements ?? null;

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
      setUrlError(null);
    },
    onError: (error: unknown) => {
      if (error instanceof AxiosError && error.response?.data?.message) {
        setUrlError(error.response.data.message);
      } else {
        setUrlError('Failed to add link. Please try again.');
      }
    },
  });

  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => linkApi.deleteLink(stashId!, signature!, id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', stashId] });
      setSelectedLinkIds(new Set());
      setLastCheckedIndex(null);
    },
  });

  const refreshScreenshotMutation = useMutation({
    mutationFn: (linkId: string) => linkApi.refreshScreenshot(stashId!, signature!, linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', stashId] });
    },
  });

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleItemClick = useCallback((linkId: string) => {
    setActiveLinkId(linkId);
  }, []);

  const handleCheckboxClick = useCallback(
    (linkId: string, index: number, shiftKey: boolean) => {
      if (shiftKey && lastCheckedIndex !== null) {
        const lo = Math.min(lastCheckedIndex, index);
        const hi = Math.max(lastCheckedIndex, index);
        const rangeIds = links.slice(lo, hi + 1).map((l) => l.id);
        setSelectedLinkIds((prev) => {
          const next = new Set(prev);
          if (prev.has(linkId)) {
            rangeIds.forEach((id) => next.delete(id));
          } else {
            rangeIds.forEach((id) => next.add(id));
          }
          return next;
        });
        // anchor stays fixed on shift-click
      } else {
        setSelectedLinkIds((prev) => {
          const next = new Set(prev);
          next.has(linkId) ? next.delete(linkId) : next.add(linkId);
          return next;
        });
        setLastCheckedIndex(index);
      }
    },
    [links, lastCheckedIndex]
  );

  const handleMasterCheckboxClick = useCallback(() => {
    if (allVisibleSelected) {
      setSelectedLinkIds(new Set());
      setLastCheckedIndex(null);
    } else {
      setSelectedLinkIds(new Set(links.map((l) => l.id)));
      setLastCheckedIndex(null);
    }
  }, [allVisibleSelected, links]);

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    const url = newLinkUrl.trim();
    const error = validateUrl(url);
    if (error) {
      setUrlError(error);
      return;
    }
    setUrlError(null);
    addLinkMutation.mutate(url);
  };

  const handleBatchDelete = useCallback(() => {
    if (!selectedLinkIds.size) return;
    if (
      confirm(
        `Delete ${selectedLinkIds.size} selected link${selectedLinkIds.size > 1 ? 's' : ''}?`
      )
    ) {
      batchDeleteMutation.mutate(Array.from(selectedLinkIds));
    }
  }, [selectedLinkIds, batchDeleteMutation]);

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

  const scrollItemIntoView = useCallback((index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const child = container.children[index] as HTMLElement | undefined;
    child?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);

  const handleListKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!['ArrowUp', 'ArrowDown', 'Space', 'Delete', 'Backspace', 'Escape'].includes(e.code)) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT') return;
      if (links.length === 0) return;

      const currentIndex = activeLinkId ? links.findIndex((l) => l.id === activeLinkId) : -1;

      if (e.code === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, links.length - 1);
        const nextLink = links[nextIndex];
        setActiveLinkId(nextLink.id);
        scrollItemIntoView(nextIndex);
        if (e.shiftKey) {
          setSelectedLinkIds((prev) => new Set([...prev, nextLink.id]));
        }
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        const prevLink = links[prevIndex];
        setActiveLinkId(prevLink.id);
        scrollItemIntoView(prevIndex);
        if (e.shiftKey) {
          setSelectedLinkIds((prev) => new Set([...prev, prevLink.id]));
        }
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (activeLinkId && currentIndex >= 0) {
          handleCheckboxClick(activeLinkId, currentIndex, false);
        }
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        e.preventDefault();
        handleBatchDelete();
      } else if (e.code === 'Escape') {
        e.preventDefault();
        if (selectedLinkIds.size > 0) {
          setSelectedLinkIds(new Set());
          setLastCheckedIndex(null);
        } else {
          setActiveLinkId(null);
        }
      }
    },
    [links, activeLinkId, selectedLinkIds, handleCheckboxClick, handleBatchDelete, scrollItemIntoView]
  );

  // Ctrl/Cmd+A: select/deselect all loaded links
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      const ctrlOrCmd = /mac/i.test(navigator.platform) ? e.metaKey : e.ctrlKey;
      if (ctrlOrCmd && e.key === 'a') {
        e.preventDefault();
        if (allVisibleSelected) {
          setSelectedLinkIds(new Set());
        } else {
          setSelectedLinkIds(new Set(links.map((l) => l.id)));
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [links, allVisibleSelected]);

  // ─── Error / Loading states ───────────────────────────────────────────────────

  if (stashError instanceof AxiosError && stashError.response?.status === 401) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
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
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Access Denied</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
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
      <div className="h-full w-full flex items-center justify-center bg-white dark:bg-slate-950">
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
      <div className="w-80 flex-shrink-0 h-full flex flex-col bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800">
        {/* Selection actions bar — always visible */}
        <div className="px-3 py-2 border-b border-slate-200/70 dark:border-slate-800/70 bg-slate-100/60 dark:bg-slate-900/60 flex items-center gap-1.5">
          {/* Master checkbox */}
          <button
            onClick={handleMasterCheckboxClick}
            disabled={links.length === 0}
            aria-label={allVisibleSelected ? 'Deselect all' : 'Select all'}
            className="flex-shrink-0 w-4 h-4 rounded border-[1.5px] flex items-center justify-center transition-all border-slate-300 dark:border-slate-600 hover:border-slate-500 disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
            style={allVisibleSelected ? { backgroundColor: 'rgb(99 102 241)', borderColor: 'rgb(99 102 241)' } : {}}
          >
            {allVisibleSelected && <CheckIcon />}
            {someSelected && <span className="w-2 h-0.5 bg-slate-500 rounded block" />}
          </button>

          {/* Count label */}
          <span className="text-[12px] text-slate-500 dark:text-slate-400 flex-1 font-medium">
            {selectedLinkIds.size === 0 ? 'No selection' : `${selectedLinkIds.size} selected`}
          </span>

          {/* "N total" prompt — only when all loaded items selected AND more pages exist */}
          {allVisibleSelected && hasNextPage && totalElements !== null && (
            <button
              onClick={() => {
                if (selectingAll) {
                  setSelectingAll(false);
                } else {
                  setSelectingAll(true);
                }
              }}
              className="text-[11px] text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 mr-1 flex-shrink-0 flex items-center gap-1"
              title={selectingAll ? 'Cancel select all' : `${totalElements} total results — click to select all`}
            >
              {selectingAll ? (
                <>
                  <svg className="w-2.5 h-2.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Selecting…
                </>
              ) : (
                `${totalElements} total`
              )}
            </button>
          )}

          {/* Refresh screenshots */}
          <button
            onClick={handleBatchRefresh}
            disabled={selectedLinkIds.size === 0 || refreshScreenshotMutation.isPending}
            title="Refresh screenshots"
            className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-30"
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

          {/* Delete selected */}
          <button
            onClick={handleBatchDelete}
            disabled={selectedLinkIds.size === 0 || batchDeleteMutation.isPending}
            title="Delete selected"
            className="p-1.5 text-red-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100/80 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-30"
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

          {/* Clear selection */}
          <button
            onClick={() => { setSelectedLinkIds(new Set()); setLastCheckedIndex(null); }}
            disabled={selectedLinkIds.size === 0}
            title="Clear selection"
            className="p-1.5 text-slate-400 dark:text-slate-600 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors disabled:opacity-30"
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

        {/* Link list — flex-1 + min-h-0 constrains height so overflow-y-auto actually scrolls */}
        <div
          ref={scrollContainerRef}
          role="listbox"
          aria-label="Links"
          aria-multiselectable="true"
          tabIndex={0}
          onKeyDown={handleListKeyDown}
          className="flex-1 min-h-0 overflow-y-auto sidebar-scroll focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500/40"
        >
          {linksLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : links.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 pb-8">
              <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-3">
                <svg
                  className="w-6 h-6 text-slate-400 dark:text-slate-600"
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
              <p className="text-slate-400 dark:text-slate-500 text-sm">
                {isSearching ? 'No links match your search' : 'No links yet — paste one below'}
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
                  {links.map((link, index) => (
                    <SortableLinkItem
                      key={link.id}
                      link={link}
                      index={index}
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
          <div className="px-3 py-2 border-t border-slate-200/70 dark:border-slate-800/70 text-[11px] text-slate-400 dark:text-slate-700 text-center">
            Drag reordering disabled during search
          </div>
        )}

        {/* Add link — at the bottom */}
        <form onSubmit={handleAddLink} className="px-3 py-2.5 border-t border-slate-200/70 dark:border-slate-800/70">
          <div className="flex gap-2">
            <input
              type="text"
              value={newLinkUrl}
              onChange={(e) => {
                setNewLinkUrl(e.target.value);
                if (urlError) setUrlError(null);
              }}
              placeholder="https://…"
              className={`flex-1 min-w-0 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/60 border rounded-lg text-[13px] text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-1 ${
                urlError
                  ? 'border-red-500/70 focus:border-red-500/70 focus:ring-red-500/20'
                  : 'border-slate-300/70 dark:border-slate-700/70 focus:border-indigo-500/70 focus:ring-indigo-500/20'
              }`}
            />
            <button
              type="submit"
              disabled={addLinkMutation.isPending || !newLinkUrl.trim()}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              {addLinkMutation.isPending ? '…' : 'Add'}
            </button>
          </div>
          {urlError && (
            <p className="text-[11px] text-red-400 mt-1.5">{urlError}</p>
          )}
        </form>
      </div>

      {/* ── Preview panel ────────────────────────────────────────────────────── */}
      <div className="flex-1 h-full flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900">
        {activeLink ? (
          <>
            {/* Header — single fixed-height row */}
            <div className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 h-11 flex items-center gap-3">
              {/* Identity: favicon · title · url — shrinks to give space to right-side controls */}
              <div className="flex-1 flex items-center gap-1.5 min-w-0">
                {activeLink.faviconUrl && (
                  <img
                    src={activeLink.faviconUrl}
                    alt=""
                    className="w-4 h-4 rounded-sm flex-shrink-0"
                  />
                )}
                <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate shrink-0 max-w-[45%]">
                  {activeLink.title || activeLink.url}
                </span>
                {activeLink.title && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600 text-[11px] flex-shrink-0">·</span>
                    <a
                      href={activeLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] text-indigo-500 hover:text-indigo-700 truncate"
                    >
                      {activeLink.url}
                    </a>
                  </>
                )}
              </div>

              {/* Slow-load warning — inline, only in live mode */}
              {showArchiveSuggestion && previewMode === 'live' && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <svg
                    className="w-3 h-3 text-amber-500 flex-shrink-0"
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
                  <button
                    onClick={switchToArchive}
                    className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Try archive →
                  </button>
                </div>
              )}

              {/* Live / Archive toggle with integrated snapshot picker.
                  Split into individual bordered buttons (no overflow-hidden wrapper)
                  so the picker's dropdown panel isn't clipped. */}
              <div className="flex text-[11px] font-medium flex-shrink-0">
                <button
                  onClick={switchToLive}
                  disabled={liveFailed}
                  className={`px-2.5 py-1 rounded-l-md border border-slate-200 dark:border-slate-700 border-r-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    previewMode === 'live'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  Live
                </button>
                <ArchiveSnapshotPicker
                  url={activeLink.url}
                  selectedTimestamp={previewMode === 'archive' ? selectedArchiveTimestamp : null}
                  onSelect={(ts) => {
                    setSelectedArchiveTimestamp(ts);
                    setArchiveLoading(true);
                  }}
                  nullLabel={previewMode === 'archive' ? 'Latest' : 'Archive'}
                  triggerClassName={`px-2.5 py-1 rounded-r-md border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 ${
                    previewMode === 'archive'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                  onOpen={() => {
                    if (previewMode !== 'archive') switchToArchive();
                  }}
                  fetchEnabled={previewMode === 'archive'}
                />
              </div>

              {/* Screenshot thumbnail */}
              <div className="flex-shrink-0">
                {activeLink.screenshotUrl ? (
                  screenshotBlobUrl ? (
                    <button
                      onClick={() => setScreenshotModalOpen(true)}
                      className="w-16 h-8 rounded overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      title="View screenshot"
                    >
                      <img
                        src={screenshotBlobUrl}
                        alt="Screenshot"
                        className="w-full h-full object-cover object-top"
                      />
                    </button>
                  ) : (
                    <div className="w-16 h-8 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700 animate-pulse" />
                  )
                ) : (
                  <button
                    onClick={() => refreshScreenshotMutation.mutate(activeLink.id)}
                    disabled={refreshScreenshotMutation.isPending}
                    title={
                      refreshScreenshotMutation.isPending
                        ? 'Generating screenshot…'
                        : 'Generate screenshot'
                    }
                    className="w-16 h-8 rounded border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-500 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {refreshScreenshotMutation.isPending ? (
                      <svg
                        className="w-3 h-3 text-slate-400 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-3 h-3 text-slate-300"
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
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* iframe area */}
            <div className="flex-1 overflow-hidden relative">
              {previewMode === 'live' ? (
                <>
                  {liveLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 z-10">
                      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-slate-500 dark:text-slate-400 text-sm mt-3">Loading website…</p>
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 z-10">
                      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      {liveFailed && (
                        <p className="text-amber-600 text-xs mt-3">
                          Live preview couldn't load — switching to archive
                        </p>
                      )}
                      <p className={`text-slate-500 dark:text-slate-400 text-sm ${liveFailed ? 'mt-1' : 'mt-3'}`}>
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
                  <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
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
                  <p className="text-slate-700 dark:text-slate-300 font-semibold">
                    {selectedLinkIds.size} links selected
                  </p>
                  <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                    Use the actions in the sidebar to manage them
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-slate-300 dark:text-slate-600"
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
                  <p className="text-slate-600 dark:text-slate-400 font-semibold">Select a link to preview</p>
                  <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
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
              {screenshotBlobUrl ? (
                <img
                  src={screenshotBlobUrl}
                  alt={`Screenshot of ${activeLink.title || activeLink.url}`}
                  className="w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
                />
              ) : (
                <div className="w-full h-64 bg-white/10 animate-pulse rounded-xl" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
