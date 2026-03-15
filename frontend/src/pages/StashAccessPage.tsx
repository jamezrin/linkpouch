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
import { api, stashApi, linkApi, utilsApi, isTokenValid, tokenStorageKey, signatureStorageKey, claimerStorageKey, accountFingerprintKey, accountFingerprint } from '../services/api';
import { useStashHistory } from '../hooks/useStashHistory';
import { Link as LinkType } from '../types';
import { useStashSearch } from '../contexts/stashSearch';
import { useStashToken } from '../hooks/useStashToken';
import { ArchiveSnapshotPicker } from '../components/ArchiveSnapshotPicker';
import { BulkImportModal } from '../components/BulkImportModal';
import { FilePlusCorner } from 'lucide-react';
import DemoButton from '../components/DemoButton';
import { features } from '../features';
import { useStashEvents } from '../hooks/useStashEvents';
import { PouchIcon } from '../components/PouchIcon';
import { useOnboardingWalkthrough, usePreviewWalkthrough } from '../hooks/useWalkthroughs';
import { useAccount } from '../contexts/account';
import { accountApi } from '../services/accountApi';
import SignInModal from '../components/SignInModal';

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

const formatRelativeTime = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} ago`;
};

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
      style={{ width: Math.min(272, window.innerWidth * 0.9), opacity: 0.97 }}
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
      onClick={(e) => {
        onItemClick(link.id);
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          onCheckboxClick(link.id, index, e.shiftKey);
        }
      }}
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
  dragDisabled: boolean;
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
  dragDisabled,
  index,
  onItemClick,
  onCheckboxClick,
}: SortableLinkItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: link.id,
    disabled: isSearching || dragDisabled,
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
        isDragDisabled={isSearching || dragDisabled}
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
  const { searchQuery, setSearchQuery, mobilePane, setMobilePane, setCanWrite, setIsClaimerToken: setContextIsClaimerToken } = useStashSearch();
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [links, setLinks] = useState<LinkType[]>([]);
  const [screenshotModalOpen, setScreenshotModalOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('live');
  const [liveLoading, setLiveLoading] = useState(false);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [showArchiveSuggestion, setShowArchiveSuggestion] = useState(false);
  const [liveFailed, setLiveFailed] = useState(false);
  const [selectedArchiveTimestamp, setSelectedArchiveTimestamp] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const { token: accessToken, setToken: setAccessToken } = useStashToken(stashId);
  type AuthState = 'acquiring' | 'password_required' | 'ready' | 'error' | 'private';
  const [authState, setAuthState] = useState<AuthState>('acquiring');
  const [authAttempt, setAuthAttempt] = useState(0);
  const versionMismatchRetryCountRef = useRef(0);
  const handleTokenExpiredRef = useRef<() => void>(() => {});
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const { stashSettingsOpen, setStashSettingsOpen } = useStashSearch();
  const [settingsPassword, setSettingsPassword] = useState('');
  const [settingsPasswordError, setSettingsPasswordError] = useState<string | null>(null);
  const [settingsPasswordPending, setSettingsPasswordPending] = useState(false);
  const [removePasswordConfirm, setRemovePasswordConfirm] = useState(false);
  const [showSettingsPassword, setShowSettingsPassword] = useState(false);
  const [visibilityPending, setVisibilityPending] = useState(false);
  const [linkPermissionsPending, setLinkPermissionsPending] = useState(false);
  const [isClaimerToken, setIsClaimerToken] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [signatureRefreshedAt, setSignatureRefreshedAt] = useState<string | null>(null);
  const [regenerateSignaturePending, setRegenerateSignaturePending] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const liveIframeRef = useRef<HTMLIFrameElement>(null);
  const blockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();
  const { accountToken, isSignedIn } = useAccount();
  const { recordEntry } = useStashHistory();

  if (!stashId || (!signature && !isSignedIn)) {
    return <Navigate to="/" replace />;
  }

  // ─── SSE: real-time link updates ─────────────────────────────────────────────

  useStashEvents({
    stashId,
    accessToken,
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

  // ─── Token acquisition ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!stashId) return;

    // Try cached token first (read directly from sessionStorage to avoid stale closure)
    const cached = sessionStorage.getItem(tokenStorageKey(stashId));
    const cachedFingerprint = sessionStorage.getItem(accountFingerprintKey(stashId));
    if (cached && isTokenValid(cached) && cachedFingerprint === accountFingerprint(accountToken)) {
      setIsClaimerToken(sessionStorage.getItem(claimerStorageKey(stashId)) === 'true');
      setAuthState('ready');
      return;
    }

    setAuthState('acquiring');

    // Unified acquisition: pass both signature and account JWT. The server determines
    // isClaimer from the account JWT, and grants access to private stashes if claimer.
    stashApi.acquireAccessToken(stashId, signature, undefined, accountToken ?? undefined)
      .then((res) => {
        versionMismatchRetryCountRef.current = 0;
        setAccessToken(res.data.accessToken);
        sessionStorage.setItem(claimerStorageKey(stashId), String(res.data.isClaimer));
        sessionStorage.setItem(accountFingerprintKey(stashId), accountFingerprint(accountToken));
        setIsClaimerToken(res.data.isClaimer);
        setAuthState('ready');
      })
      .catch((err) => {
        const errorCode = err?.response?.data?.errorCode;
        if (errorCode === 'PASSWORD_REQUIRED') {
          setAuthState('password_required');
        } else if (errorCode === 'STASH_PRIVATE') {
          setAuthState('private');
        } else if (errorCode === 'SIGNATURE_REGENERATED') {
          setSignatureRefreshedAt(err.response.data.signatureRefreshedAt ?? null);
          setAuthState('error');
        } else {
          setAuthState('error');
        }
      });
  // authAttempt is intentionally included: incrementing it triggers re-acquisition after expiry
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stashId, signature, authAttempt, isSignedIn, accountToken]);

  // Keep the ref in sync with the latest stashId / setAccessToken so the interceptor
  // always calls the most recent version without stale closures.
  useEffect(() => {
    handleTokenExpiredRef.current = () => {
      if (stashId) {
        sessionStorage.removeItem(tokenStorageKey(stashId));
        sessionStorage.removeItem(claimerStorageKey(stashId));
        sessionStorage.removeItem(accountFingerprintKey(stashId));
      }
      setAccessToken(null);
      setAuthAttempt((n) => n + 1);
    };
  }, [stashId, setAccessToken]);

  // ─── 401 interceptor — re-acquire token when JWT expires ─────────────────────
  useEffect(() => {
    const id = api.interceptors.response.use(
      undefined,
      (error) => {
        // Only react to 401s on authenticated endpoints, not on acquireAccessToken itself
        if (
          error?.response?.status === 401 &&
          !error.config?.url?.includes('/access-token')
        ) {
          if (error?.response?.data?.errorCode === 'TOKEN_VERSION_MISMATCH') {
            // Guard against infinite re-acquisition loops (max 3 retries)
            if (versionMismatchRetryCountRef.current < 3) {
              versionMismatchRetryCountRef.current++;
              handleTokenExpiredRef.current();
            }
          } else {
            versionMismatchRetryCountRef.current = 0;
            handleTokenExpiredRef.current();
          }
        }
        return Promise.reject(error);
      },
    );
    return () => api.interceptors.response.eject(id);
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stashId || !passwordInput.trim()) return;
    setPasswordSubmitting(true);
    setPasswordError(null);
    try {
      const res = await stashApi.acquireAccessToken(stashId, signature, passwordInput, accountToken ?? undefined);
      setAccessToken(res.data.accessToken);
      setIsClaimerToken(res.data.isClaimer);
      setAuthState('ready');
    } catch (err: unknown) {
      setPasswordError('Incorrect password. Please try again.');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stashId || !accessToken || !settingsPassword.trim()) return;
    setSettingsPasswordPending(true);
    setSettingsPasswordError(null);
    try {
      await stashApi.setPassword(stashId, settingsPassword, accessToken);
      // Re-acquire token — version bumped when password is set/changed.
      const res = await stashApi.acquireAccessToken(stashId, signature, settingsPassword, accountToken ?? undefined);
      setAccessToken(res.data.accessToken);
      setIsClaimerToken(res.data.isClaimer);
      setSettingsPassword('');
      await queryClient.invalidateQueries({ queryKey: ['stash', stashId] });
    } catch {
      setSettingsPasswordError('Failed to set password. Please try again.');
    } finally {
      setSettingsPasswordPending(false);
    }
  };

  const handleRemovePassword = async () => {
    if (!stashId || !accessToken) return;
    setSettingsPasswordPending(true);
    setSettingsPasswordError(null);
    try {
      await stashApi.removePassword(stashId, accessToken);
      // Re-acquire token — version bumped when password is removed.
      const res = await stashApi.acquireAccessToken(stashId, signature, undefined, accountToken ?? undefined);
      setAccessToken(res.data.accessToken);
      setIsClaimerToken(res.data.isClaimer);
      setRemovePasswordConfirm(false);
      await queryClient.invalidateQueries({ queryKey: ['stash', stashId] });
    } catch {
      setSettingsPasswordError('Failed to remove password. Please try again.');
    } finally {
      setSettingsPasswordPending(false);
    }
  };

  const closeSettings = () => {
    setStashSettingsOpen(false);
    setSettingsPassword('');
    setSettingsPasswordError(null);
    setRemovePasswordConfirm(false);
  };

  const handleRegenerateSignature = async () => {
    if (!stashId || !accessToken) return;
    setRegenerateSignaturePending(true);
    try {
      const res = await stashApi.regenerateSignature(stashId, accessToken);
      const signedUrl: string = (res.data as any).signedUrl ?? '';
      const parts = signedUrl.split(`/s/${stashId}/`);
      const newSig = parts.length > 1 ? parts[1] : null;
      if (newSig) {
        try { sessionStorage.setItem(signatureStorageKey(stashId), newSig); } catch { /* ignore */ }
        if (stash?.name) {
          recordEntry(stashId, stash.name, newSig);
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['stash', stashId] });
    } catch {
      // Non-fatal — silently ignore
    } finally {
      setRegenerateSignaturePending(false);
    }
  };

  const handleVisibilityChange = async (newVisibility: 'PRIVATE' | 'SHARED') => {
    if (!stashId || !accountToken || !stash || newVisibility === stash.visibility) return;
    setVisibilityPending(true);
    try {
      await accountApi.updateVisibility(accountToken, stashId, newVisibility);
      await queryClient.invalidateQueries({ queryKey: ['stash', stashId] });
      await queryClient.invalidateQueries({ queryKey: ['account'] });
    } finally {
      setVisibilityPending(false);
    }
  };

  const handleLinkPermissionsChange = async (newPermissions: 'FULL' | 'READ_ONLY') => {
    if (!stashId || !accountToken || !stash || newPermissions === stash.linkPermissions) return;
    setLinkPermissionsPending(true);
    try {
      await accountApi.updateLinkPermissions(accountToken, stashId, newPermissions);
      await queryClient.invalidateQueries({ queryKey: ['stash', stashId] });
    } finally {
      setLinkPermissionsPending(false);
    }
  };

  const disownMutation = useMutation({
    mutationFn: () => accountApi.disownStash(accountToken!, stashId!),
    onSuccess: () => handleTokenExpiredRef.current(),
  });

  const claimMutation = useMutation({
    mutationFn: () =>
      accountApi.claimStash(accountToken!, {
        stashId: stashId!,
        signature: signature ?? '',
        ...(passwordInput.trim() ? { password: passwordInput } : {}),
      }),
    onSuccess: () => handleTokenExpiredRef.current(),
  });

  const { data: stash, isLoading: stashLoading, error: stashError } = useQuery({
    queryKey: ['stash', stashId],
    queryFn: async () => {
      const res = await stashApi.getStash(stashId, accessToken!);
      return res.data;
    },
    enabled: !!stashId && !!accessToken,
  });

  // Stale token: if the stash was made private after the token was issued, the backend now
  // returns 403 STASH_PRIVATE from getStash. Clear the token and drop back to 'private'.
  useEffect(() => {
    if (!stashError) return;
    const code = (stashError as { response?: { data?: { errorCode?: string } } })?.response?.data?.errorCode;
    if (code === 'STASH_PRIVATE') {
      if (stashId) {
        sessionStorage.removeItem(tokenStorageKey(stashId));
        sessionStorage.removeItem(claimerStorageKey(stashId));
        sessionStorage.removeItem(accountFingerprintKey(stashId));
      }
      setAccessToken(null);
      setAuthState('private');
    }
  }, [stashError, stashId, setAccessToken]);

  const canWrite = !stash || stash.linkPermissions === 'FULL' || isClaimerToken;

  // Sync write access flags to the shared context so App.tsx can gate the header UI
  useEffect(() => { setCanWrite(canWrite); }, [canWrite, setCanWrite]);
  useEffect(() => { setContextIsClaimerToken(isClaimerToken); }, [isClaimerToken, setContextIsClaimerToken]);
  useEffect(() => () => { setCanWrite(true); setContextIsClaimerToken(false); }, [setCanWrite, setContextIsClaimerToken]);

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
        accessToken!,
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
    enabled: !!stashId && !!accessToken,
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
      setMobilePane('list');
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

  const getScreenshotSrc = (link: LinkType | null) => {
    if (!link?.screenshotUrl || !accessToken) return null;
    return linkApi.screenshotUrl(link.stashId, link.id, accessToken);
  };

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
        linkApi.reorderLinks(stashId!, accessToken!, [activeId], insertAfterId);
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
          accessToken!,
          selected.map((l) => l.id),
          insertAfterId
        );
      }
    },
    [links, selectedLinkIds, isSearching, stashId, accessToken]
  );

  // ─── Mutations ───────────────────────────────────────────────────────────────

  const addLinkMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await linkApi.addLink(stashId!, accessToken!, { url });
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
    mutationFn: (ids: string[]) => linkApi.batchDeleteLinks(stashId!, accessToken!, ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', stashId] });
      setSelectedLinkIds(new Set());
      setLastCheckedIndex(null);
    },
  });

  const refreshScreenshotMutation = useMutation({
    mutationFn: (linkId: string) => linkApi.putLinkScreenshot(stashId!, accessToken!, linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', stashId] });
    },
  });

  const batchRefreshScreenshotMutation = useMutation({
    mutationFn: (ids: string[]) => linkApi.putBatchLinkScreenshot(stashId!, accessToken!, ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', stashId] });
    },
  });

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleItemClick = useCallback((linkId: string) => {
    setActiveLinkId(linkId);
    setMobilePane('preview');
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

  const handleAddLinkPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').trim();
    if (!pasted || validateUrl(pasted)) return; // invalid — let paste happen normally
    e.preventDefault();
    setUrlError(null);
    setNewLinkUrl('');
    addLinkMutation.mutate(pasted);
  };

  // Global paste: auto-add valid URLs pasted anywhere on the page (links sidebar
  // and preview empty state). Suppressed when any overlay is open (settings,
  // bulk import, screenshot modal) so we don't intercept intentional text editing.
  // Cross-origin iframes never bubble paste events to the parent, so those are
  // naturally excluded.
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (stashSettingsOpen || bulkImportOpen || screenshotModalOpen) return;
      const target = e.target as Element;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) return;
      const pasted = e.clipboardData?.getData('text')?.trim();
      if (!pasted || validateUrl(pasted)) return;
      e.preventDefault();
      addLinkMutation.mutate(pasted);
    };
    document.addEventListener('paste', handleGlobalPaste);
    return () => document.removeEventListener('paste', handleGlobalPaste);
  }, [addLinkMutation, stashSettingsOpen, bulkImportOpen, screenshotModalOpen]);

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
    if (!confirm(`Refresh screenshots for ${selectedLinkIds.size} selected link${selectedLinkIds.size > 1 ? 's' : ''}?`)) return;
    batchRefreshScreenshotMutation.mutate(Array.from(selectedLinkIds));
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

  // ─── Walkthrough ─────────────────────────────────────────────────────────────

  const { startWalkthrough } = useOnboardingWalkthrough(stashId);

  useEffect(() => {
    if (authState === 'ready') {
      startWalkthrough();
    }
  }, [authState, startWalkthrough]);

  usePreviewWalkthrough(activeLinkId);

  // ─── Error / Loading states ───────────────────────────────────────────────────

  // Password required — show unlock modal
  if (authState === 'password_required') {
    return (
      <div className="h-full w-full flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center max-w-sm w-full mx-4">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Password required</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            This pouch is password-protected. Enter the password to access it.
          </p>
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter password"
              autoFocus
              className="w-full px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/60 text-sm"
            />
            {passwordError && (
              <p className="text-red-500 text-sm">{passwordError}</p>
            )}
            <button
              type="submit"
              disabled={passwordSubmitting || !passwordInput.trim()}
              className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {passwordSubmitting ? 'Unlocking…' : 'Unlock'}
            </button>
          </form>
          <a href="/" className="mt-6 inline-block text-slate-400 hover:text-indigo-400 text-sm transition-colors">
            ← Go back home
          </a>
        </div>
      </div>
    );
  }

  // Acquiring token — show loading
  if (authState === 'acquiring') {
    return (
      <div className="h-full w-full flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">Loading pouch…</p>
        </div>
      </div>
    );
  }

  if (authState === 'private') {
    return (
      <div className="h-full w-full flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center max-w-sm w-full mx-4">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Private pouch</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            This pouch is private. Only the account that claimed it can access it.
          </p>
          <a href="/" className="inline-block text-slate-400 hover:text-indigo-400 text-sm transition-colors">
            ← Go back home
          </a>
        </div>
      </div>
    );
  }

  if (authState === 'error') {
    return (
      <div className="h-full w-full flex items-center justify-center bg-white dark:bg-slate-950">
        <div className="text-center max-w-sm w-full mx-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Access Denied</h2>
          {signatureRefreshedAt ? (
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              The URL for this pouch was changed on{' '}
              {new Date(signatureRefreshedAt).toLocaleDateString('en', { month: 'long', day: 'numeric', year: 'numeric' })}.
              Bookmark the new link to regain access.
            </p>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Invalid or expired signature. Check your URL.
            </p>
          )}
          <a href="/" className="text-indigo-400 hover:text-indigo-300 text-sm">
            ← Go back home
          </a>
        </div>
      </div>
    );
  }

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
          <p className="text-slate-500 dark:text-slate-400 text-sm">Loading pouch…</p>
        </div>
      </div>
    );
  }

  // ─── Main layout ─────────────────────────────────────────────────────────────

  return (
    <>
    <div className="h-full w-full flex overflow-hidden">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <div className={[
        'h-full flex-col bg-white dark:bg-slate-950',
        'border-r border-slate-200 dark:border-slate-800',
        'w-full md:w-80 md:flex-shrink-0',
        mobilePane === 'preview' ? 'hidden md:flex' : 'flex',
      ].join(' ')}>
        {/* Selection actions bar — always visible */}
        <div id="lp-bulk-actions" className="px-3 py-2 border-b border-slate-200/70 dark:border-slate-800/70 bg-slate-100/60 dark:bg-slate-900/60 flex items-center gap-1.5">
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
            disabled={selectedLinkIds.size === 0 || batchRefreshScreenshotMutation.isPending || !canWrite}
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
            disabled={selectedLinkIds.size === 0 || batchDeleteMutation.isPending || !canWrite}
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

        {/* Search */}
        <div id="lp-search-bar" className="flex items-center gap-2 px-3 py-2 border-b border-slate-200/70 dark:border-slate-800/70">
          <svg
            className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"
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
            className="flex-1 min-w-0 bg-transparent text-[13px] text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
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
            <div id="lp-empty-state" className="flex flex-col items-center justify-center h-full text-center px-6 pb-8">
              <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-3">
                <PouchIcon className="w-6 h-6 text-slate-400 dark:text-slate-600" strokeWidth={1.5} />
              </div>
              <p className="text-slate-400 dark:text-slate-500 text-sm">
                {isSearching ? 'No links match your search' : canWrite ? 'No links yet — paste one below' : 'No links have been added yet'}
              </p>
              {!isSearching && canWrite && features.demoButton && stashId && accessToken && (
                <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                  Or <DemoButton stashId={stashId} accessToken={accessToken} variant="inline" />
                </p>
              )}
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
                      dragDisabled={!canWrite}
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

        {/* Add link + bulk import — combined row */}
        {canWrite && <form onSubmit={handleAddLink} className="px-3 py-2.5 border-t border-slate-200/70 dark:border-slate-800/70">
          <div className="flex gap-1.5 items-center">
            {/* Unified input + submit pill */}
            <div className={`relative flex flex-1 min-w-0 items-center bg-slate-100 dark:bg-slate-800/60 border rounded-lg transition-all focus-within:ring-1 ${
              urlError
                ? 'border-red-500/70 focus-within:ring-red-500/20'
                : 'border-slate-300/70 dark:border-slate-700/70 focus-within:border-indigo-500/70 focus-within:ring-indigo-500/20'
            }`}>
              <input
                id="lp-add-link-input"
                type="text"
                value={newLinkUrl}
                onChange={(e) => {
                  setNewLinkUrl(e.target.value);
                  if (urlError) setUrlError(null);
                }}
                onPaste={handleAddLinkPaste}
                placeholder="https://example.com"
                className="flex-1 min-w-0 pl-3 pr-1 py-1.5 bg-transparent text-[13px] text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={addLinkMutation.isPending || !newLinkUrl.trim()}
                className="mr-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-[12px] font-medium transition-colors disabled:opacity-0 flex-shrink-0"
              >
                {addLinkMutation.isPending ? '…' : 'Add'}
              </button>
            </div>
            {/* Bulk import */}
            <button
              type="button"
              onClick={() => setBulkImportOpen(true)}
              title="Bulk import"
              className="px-2 py-1.5 rounded-lg border border-slate-300/70 dark:border-slate-700/70 text-slate-400 dark:text-slate-500 hover:border-indigo-400/70 dark:hover:border-indigo-600/70 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors flex-shrink-0"
              aria-label="Bulk import"
            >
              <FilePlusCorner className="w-4 h-4" />
            </button>
          </div>
          {urlError && (
            <p className="text-[11px] text-red-400 mt-1.5">{urlError}</p>
          )}
        </form>}
      </div>

      {/* ── Preview panel ────────────────────────────────────────────────────── */}
      <div className={[
        'h-full flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 flex-1',
        mobilePane === 'list' ? 'hidden md:flex' : 'flex',
      ].join(' ')}>
        {activeLink ? (
          <>
            {/* Header — two rows on mobile, one row on desktop */}
            <div className="flex-shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">

              {/* Row 1: back button + identity */}
              <div className="px-4 h-11 flex items-center gap-3">
              {/* Back button — mobile only */}
              <button
                className="md:hidden flex items-center gap-1 text-[13px] font-medium text-indigo-500 hover:text-indigo-600 flex-shrink-0 mr-2 transition-colors"
                onClick={() => setMobilePane('list')}
                aria-label="Back to links list"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span>Links</span>
              </button>

              {/* Identity: favicon · title · url (url hidden on mobile) */}
              <div className="flex-1 flex items-center gap-1.5 min-w-0">
                {activeLink.faviconUrl && (
                  <img
                    src={activeLink.faviconUrl}
                    alt=""
                    className="w-4 h-4 rounded-sm flex-shrink-0"
                  />
                )}
                <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {activeLink.title || activeLink.url}
                </span>
                {activeLink.title && (
                  <>
                    <span className="hidden md:inline text-slate-300 dark:text-slate-600 text-[11px] flex-shrink-0">·</span>
                    <a
                      id="lp-preview-url-link"
                      href={activeLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hidden md:block text-[12px] text-indigo-500 hover:text-indigo-700 truncate"
                    >
                      {activeLink.url}
                    </a>
                  </>
                )}
              </div>

              {/* Slow-load warning — desktop only (shown in row 2 on mobile) */}
              {showArchiveSuggestion && previewMode === 'live' && (
                <div className="hidden md:flex items-center gap-1 flex-shrink-0">
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

              {/* Live / Archive toggle — desktop only (shown in row 2 on mobile) */}
              <div id="lp-live-archive-toggle" className="hidden md:flex text-[11px] font-medium flex-shrink-0">
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

              {/* Screenshot thumbnail — desktop only (shown in row 2 on mobile) */}
              <div id="lp-screenshot-thumb" className="hidden md:block flex-shrink-0">
                {activeLink.screenshotUrl && accessToken ? (
                  <button
                    onClick={() => setScreenshotModalOpen(true)}
                    className="w-16 h-8 rounded overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    title="View screenshot"
                  >
                    <img
                      src={linkApi.screenshotUrl(activeLink.stashId, activeLink.id, accessToken)}
                      alt="Screenshot"
                      className="w-full h-full object-cover object-top"
                    />
                  </button>
                ) : activeLink.screenshotUrl ? (
                  <div className="w-16 h-8 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700 animate-pulse" />
                ) : (
                  <button
                    onClick={() => refreshScreenshotMutation.mutate(activeLink.id)}
                    disabled={refreshScreenshotMutation.isPending || !canWrite}
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
              </div>{/* end Row 1 */}

              {/* Row 2: mobile only — Live/Archive controls + screenshot */}
              <div id="lp-preview-controls-mobile" className="md:hidden flex items-center gap-2 px-4 py-1.5 border-t border-slate-100 dark:border-slate-700/50">
                {/* Slow-load warning */}
                {showArchiveSuggestion && previewMode === 'live' && (
                  <div className="flex items-center gap-1 flex-shrink-0 mr-1">
                    <svg className="w-3 h-3 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <button onClick={switchToArchive} className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium">
                      Try archive →
                    </button>
                  </div>
                )}
                {/* Live / Archive toggle */}
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
                    onSelect={(ts) => { setSelectedArchiveTimestamp(ts); setArchiveLoading(true); }}
                    nullLabel={previewMode === 'archive' ? 'Latest' : 'Archive'}
                    triggerClassName={`px-2.5 py-1 rounded-r-md border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1 ${
                      previewMode === 'archive'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                    onOpen={() => { if (previewMode !== 'archive') switchToArchive(); }}
                    fetchEnabled={previewMode === 'archive'}
                  />
                </div>
                <div className="flex-1" />
                {/* Screenshot thumbnail */}
                <div className="flex-shrink-0">
                  {activeLink.screenshotUrl && accessToken ? (
                    <button
                      onClick={() => setScreenshotModalOpen(true)}
                      className="w-14 h-7 rounded overflow-hidden border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      title="View screenshot"
                    >
                      <img src={linkApi.screenshotUrl(activeLink.stashId, activeLink.id, accessToken)} alt="Screenshot" className="w-full h-full object-cover object-top" />
                    </button>
                  ) : activeLink.screenshotUrl ? (
                    <div className="w-14 h-7 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700 animate-pulse" />
                  ) : (
                    <button
                      onClick={() => refreshScreenshotMutation.mutate(activeLink.id)}
                      disabled={refreshScreenshotMutation.isPending || !canWrite}
                      title={refreshScreenshotMutation.isPending ? 'Generating screenshot…' : 'Generate screenshot'}
                      className="w-14 h-7 rounded border border-dashed border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center disabled:opacity-50"
                    >
                      {refreshScreenshotMutation.isPending ? (
                        <svg className="w-3 h-3 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>{/* end Row 2 */}
            </div>{/* end header outer wrapper */}

            {/* iframe area */}
            <div id="lp-preview-iframe" className="flex-1 overflow-hidden relative">
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
              {getScreenshotSrc(activeLink) ? (
                <img
                  src={getScreenshotSrc(activeLink)!}
                  alt={`Screenshot of ${activeLink.title || activeLink.url}`}
                  className="w-full max-h-[85dvh] object-contain rounded-xl shadow-2xl"
                />
              ) : (
                <div className="w-full h-64 bg-white/10 animate-pulse rounded-xl" />
              )}
              {activeLink.screenshotGeneratedAt && (
                <p className="mt-2 text-center text-xs text-white/50">
                  Captured {formatRelativeTime(activeLink.screenshotGeneratedAt)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>

    {signInOpen && <SignInModal onClose={() => setSignInOpen(false)} />}

    {bulkImportOpen && stashId && accessToken && (
      <BulkImportModal
        stashId={stashId}
        accessToken={accessToken}
        onClose={() => setBulkImportOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['links', stashId] })}
      />
    )}

    {/* ── Settings overlay ──────────────────────────────────────────────── */}
    {stashSettingsOpen && (
      <>
        {/* Backdrop — clicking outside closes the panel */}
        <div className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40" onClick={closeSettings} />

        {/* Panel */}
        <div className="fixed top-0 right-0 bottom-0 z-50 w-80 bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">

          {/* Panel header */}
          <div className="h-11 flex-shrink-0 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Stash settings</span>
            <button
              onClick={closeSettings}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable settings content */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">

            {/* ── Password ─────────────────────────────────────────────── */}
            {(isClaimerToken || signature) && <section className="p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Password</h3>

              {stash?.passwordProtected ? (
                <div className="flex flex-col gap-3 mt-3">
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-snug">
                    This pouch is password-protected. Change or remove the password below.
                  </p>
                  <form onSubmit={handleSetPassword} className="flex flex-col gap-2">
                    <div className="relative">
                      <input
                        type={showSettingsPassword ? 'text' : 'password'}
                        value={settingsPassword}
                        onChange={(e) => setSettingsPassword(e.target.value)}
                        placeholder="New password…"
                        className="w-full px-3 py-2 pr-9 text-[13px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSettingsPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        tabIndex={-1}
                      >
                        {showSettingsPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        )}
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={settingsPasswordPending || !settingsPassword.trim()}
                      className="w-full py-2 text-[13px] font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {settingsPasswordPending ? 'Saving…' : 'Change password'}
                    </button>
                  </form>

                  {removePasswordConfirm ? (
                    <div className="flex flex-col gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40">
                      <p className="text-[12px] text-red-700 dark:text-red-300 leading-snug">
                        Anyone with the pouch URL will be able to access it. This cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleRemovePassword}
                          disabled={settingsPasswordPending}
                          className="flex-1 py-1.5 text-[13px] font-medium bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors disabled:opacity-40"
                        >
                          {settingsPasswordPending ? 'Removing…' : 'Remove'}
                        </button>
                        <button
                          onClick={() => setRemovePasswordConfirm(false)}
                          className="flex-1 py-1.5 text-[13px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRemovePasswordConfirm(true)}
                      className="w-full py-2 text-[13px] text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg border border-red-100 dark:border-red-900/40 transition-colors"
                    >
                      Remove password
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2 mt-3">
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-snug">
                    Add a passphrase on top of the signed URL to restrict who can access this pouch.
                  </p>
                  <form onSubmit={handleSetPassword} className="flex flex-col gap-2">
                    <div className="relative">
                      <input
                        type={showSettingsPassword ? 'text' : 'password'}
                        value={settingsPassword}
                        onChange={(e) => setSettingsPassword(e.target.value)}
                        placeholder="Choose a password…"
                        className="w-full px-3 py-2 pr-9 text-[13px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/60"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSettingsPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        tabIndex={-1}
                      >
                        {showSettingsPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        )}
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={settingsPasswordPending || !settingsPassword.trim()}
                      className="w-full py-2 text-[13px] font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {settingsPasswordPending ? 'Saving…' : 'Set password'}
                    </button>
                  </form>
                </div>
              )}

              {settingsPasswordError && (
                <p className="mt-2 text-[12px] text-red-500">{settingsPasswordError}</p>
              )}
            </section>}

            {/* ── Account ──────────────────────────────────────────────── */}
            <section className="p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Account</h3>

              {!isSignedIn ? (
                <div className="flex flex-col gap-2">
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-snug">
                    Sign in to link this pouch to your account and recover it across devices.
                  </p>
                  <button
                    onClick={() => setSignInOpen(true)}
                    className="w-full py-2 text-[13px] font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                  >
                    Sign in
                  </button>
                </div>
              ) : isClaimerToken ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    This pouch is linked to your account.
                  </div>
                  <button
                    onClick={() => disownMutation.mutate()}
                    disabled={disownMutation.isPending}
                    className="w-full py-2 text-[13px] text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg border border-red-100 dark:border-red-900/40 transition-colors disabled:opacity-40"
                  >
                    {disownMutation.isPending ? 'Removing…' : 'Unlink pouch'}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-snug">
                    Link this pouch to your account to recover it across devices.
                  </p>
                  <button
                    onClick={() => claimMutation.mutate()}
                    disabled={claimMutation.isPending}
                    className="w-full py-2 text-[13px] font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-40"
                  >
                    {claimMutation.isPending ? 'Claiming…' : 'Claim this pouch'}
                  </button>
                  {claimMutation.isError && (
                    <p className="text-[12px] text-red-500">Failed to claim. Please try again.</p>
                  )}
                </div>
              )}
            </section>

            {/* ── Visibility ────────────────────────────────────────────── */}
            {isClaimerToken && stash && (
              <section className="p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Visibility</h3>
                <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {(['PRIVATE', 'SHARED'] as const).map((option, i) => (
                    <button
                      key={option}
                      onClick={() => handleVisibilityChange(option)}
                      disabled={visibilityPending}
                      className={[
                        'flex-1 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-50',
                        i > 0 ? 'border-l border-slate-200 dark:border-slate-700' : '',
                        stash.visibility === option
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800',
                      ].join(' ')}
                    >
                      {option === 'PRIVATE' ? 'Private' : 'Shared'}
                    </button>
                  ))}
                </div>
                <p className="text-[12px] text-slate-400 dark:text-slate-500 leading-snug mt-2">
                  {stash.visibility === 'PRIVATE'
                    ? 'Only you can access this pouch.'
                    : 'Anyone with the URL can access this pouch.'}
                </p>
              </section>
            )}

            {/* ── Link permissions ──────────────────────────────────────── */}
            {isClaimerToken && stash && stash.visibility === 'SHARED' && (
              <section className="p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Visitor permissions</h3>
                <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                  {(['FULL', 'READ_ONLY'] as const).map((option, i) => (
                    <button
                      key={option}
                      onClick={() => handleLinkPermissionsChange(option)}
                      disabled={linkPermissionsPending}
                      className={[
                        'flex-1 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-50',
                        i > 0 ? 'border-l border-slate-200 dark:border-slate-700' : '',
                        stash.linkPermissions === option
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800',
                      ].join(' ')}
                    >
                      {option === 'FULL' ? 'Can edit' : 'Read-only'}
                    </button>
                  ))}
                </div>
                <p className="text-[12px] text-slate-400 dark:text-slate-500 leading-snug mt-2">
                  {stash.linkPermissions === 'FULL'
                    ? 'Anyone with access can add, remove, and reorder links.'
                    : 'Only you can add, remove, and reorder links.'}
                </p>
              </section>
            )}

            {/* ── Regenerate URL ────────────────────────────────────── */}
            {signature && (
              <section className="p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Shared URL</h3>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-snug mb-3">
                  Generate a new URL for this pouch. Anyone using the old link will lose access.
                </p>
                <button
                  onClick={handleRegenerateSignature}
                  disabled={regenerateSignaturePending}
                  className="w-full py-2 text-[13px] text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {regenerateSignaturePending ? 'Regenerating…' : 'Regenerate URL'}
                </button>
              </section>
            )}

          </div>
        </div>
      </>
    )}
</>
  );
}
