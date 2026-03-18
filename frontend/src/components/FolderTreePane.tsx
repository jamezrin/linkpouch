import React, { useState, useCallback, useEffect, useRef, useContext, createContext } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core';
import { useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  GripVertical,
  ExternalLink,
  FolderInput,
  Pencil,
  FolderPlus,
  Folder as FolderIcon,
  ChevronsDownUp,
  ChevronsUpDown,
} from 'lucide-react';
import { Folder, Link as LinkType } from '../types';
import { linkApi, folderApi } from '../services/api';
import { FolderItem } from './FolderItem';
import { LinkItem } from './LinkItem';
import { CreateFolderModal } from './CreateFolderModal';
import { ContextMenu } from './ContextMenu';
import type { ContextMenuEntry } from './ContextMenu';
import { FolderPickerModal } from './FolderPickerModal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FolderTreePaneProps {
  stashId: string;
  accessToken: string;
  folders: Folder[];
  activeFolderId: string | null;
  activeLinkId: string | null;
  selectedLinkIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onSelectAll: () => void;
  isReadOnly: boolean;
  onFolderSelect: (folderId: string | null) => void;
  onLinkActivate: (linkId: string | null, link?: LinkType | null) => void;
  onFolderDeleted: () => void;
  emptyState?: React.ReactNode;
}

interface ContextMenuState {
  x: number;
  y: number;
  type: 'link' | 'folder';
  id: string;
}

type DropTarget =
  | { kind: 'before-link'; linkId: string; scopeFolderId: string | null }
  | { kind: 'after-link'; linkId: string; scopeFolderId: string | null }
  | { kind: 'into-folder'; folderId: string }
  | { kind: 'before-folder'; folderId: string; parentFolderId: string | null }
  | { kind: 'after-folder'; folderId: string; parentFolderId: string | null }
  | null;

// ─── DnD Context ─────────────────────────────────────────────────────────────

interface DragCtxValue {
  dropTarget: DropTarget;
  draggingType: 'link' | 'folder' | null;
  draggingIds: Set<string>;
}
const DragCtx = createContext<DragCtxValue>({
  dropTarget: null,
  draggingType: null,
  draggingIds: new Set(),
});

// ─── DraggableLinkRow ─────────────────────────────────────────────────────────

interface DraggableLinkRowProps {
  link: LinkType;
  index: number;
  depth?: number;
  isSelected: boolean;
  isActive: boolean;
  onItemClick: (id: string) => void;
  onCheckboxClick: (id: string, index: number, shiftKey: boolean) => void;
  onContextMenu: (e: React.MouseEvent, linkId: string) => void;
  isReadOnly: boolean;
}

const DraggableLinkRow = ({
  link,
  index,
  depth = 0,
  isSelected,
  isActive,
  onItemClick,
  onCheckboxClick,
  onContextMenu,
  isReadOnly,
}: DraggableLinkRowProps) => {
  const { dropTarget, draggingType, draggingIds } = useContext(DragCtx);

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `link:${link.id}`,
    data: { type: 'link', link, scopeFolderId: link.folderId ?? null },
    disabled: isReadOnly,
  });

  const { setNodeRef: setDropRef } = useDroppable({ id: `link:${link.id}` });

  const setRef = (el: HTMLElement | null) => {
    setDragRef(el);
    setDropRef(el);
  };

  const isGroupDragging = !isDragging && draggingIds.has(link.id);
  const isDropBefore = dropTarget?.kind === 'before-link' && dropTarget.linkId === link.id;
  const isDropAfter = dropTarget?.kind === 'after-link' && dropTarget.linkId === link.id;
  const depthTint =
    depth > 0 ? `rgba(99, 102, 241, ${Math.min(depth, 4) * 0.03})` : undefined;

  return (
    <div
      ref={setRef}
      {...attributes}
      {...listeners}
      data-link-id={link.id}
      className="relative"
      style={{
        opacity: isDragging || isGroupDragging ? 0.4 : 1,
        touchAction: 'none',
        backgroundColor: depthTint,
      }}
    >
      {isDropBefore && (
        <div className="absolute top-0 left-2 right-2 h-0.5 bg-indigo-400 z-10 rounded-full pointer-events-none" />
      )}
      <LinkItem
        link={link}
        isSelected={isSelected}
        isActive={isActive}
        index={index}
        depth={depth}
        isDragDisabled={isReadOnly}
        isGroupDragging={isGroupDragging}
        onItemClick={onItemClick}
        onCheckboxClick={onCheckboxClick}
        onContextMenu={draggingType === null ? (e) => { e.preventDefault(); onContextMenu(e, link.id); } : undefined}
      />
      {isDropAfter && (
        <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-400 z-10 rounded-full pointer-events-none" />
      )}
    </div>
  );
};

// ─── DraggableFolderRow ───────────────────────────────────────────────────────

interface DraggableFolderRowProps {
  folder: Folder;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  isRenaming: boolean;
  isReadOnly: boolean;
  onToggle: (id: string) => void;
  onClick: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onStartRename: (id: string) => void;
  onCancelRename: () => void;
  onContextMenu: (e: React.MouseEvent, folderId: string) => void;
}

const DraggableFolderRow = ({
  folder,
  depth,
  isExpanded,
  isSelected,
  isRenaming,
  isReadOnly,
  onToggle,
  onClick,
  onRename,
  onStartRename,
  onCancelRename,
  onContextMenu,
}: DraggableFolderRowProps) => {
  const { dropTarget } = useContext(DragCtx);

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `folder:${folder.id}`,
    data: { type: 'folder', folder, parentFolderId: folder.parentFolderId ?? null },
    disabled: isReadOnly,
  });

  const { setNodeRef: setDropRef } = useDroppable({ id: `folder:${folder.id}` });

  const setRef = (el: HTMLElement | null) => {
    setDragRef(el);
    setDropRef(el);
  };

  const isDropInto = dropTarget?.kind === 'into-folder' && dropTarget.folderId === folder.id;
  const isDropBefore = dropTarget?.kind === 'before-folder' && dropTarget.folderId === folder.id;
  const isDropAfter = dropTarget?.kind === 'after-folder' && dropTarget.folderId === folder.id;

  return (
    <div
      ref={setRef}
      {...attributes}
      {...listeners}
      className="relative"
      style={{ opacity: isDragging ? 0.4 : 1, touchAction: 'none' }}
    >
      {isDropBefore && (
        <div className="absolute top-0 left-2 right-2 h-0.5 bg-indigo-400 z-10 rounded-full pointer-events-none" />
      )}
      <FolderItem
        folder={folder}
        isExpanded={isExpanded}
        isSelected={isSelected}
        depth={depth}
        onToggle={onToggle}
        onClick={onClick}
        onRename={onRename}
        isRenaming={isRenaming}
        onStartRename={onStartRename}
        onCancelRename={onCancelRename}
        isDropTarget={isDropInto}
        onContextMenu={(e) => {
          if (!isReadOnly) {
            e.preventDefault();
            onContextMenu(e, folder.id);
          }
        }}
      />
      {isDropAfter && (
        <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-400 z-10 rounded-full pointer-events-none" />
      )}
    </div>
  );
};

// ─── FolderSubtree ────────────────────────────────────────────────────────────

interface FolderSubtreeProps {
  folder: Folder;
  depth: number;
  allFolders: Folder[];
  expandedFolders: Set<string>;
  renamingFolderId: string | null;
  activeFolderId: string | null;
  activeLinkId: string | null;
  selectedLinkIds: Set<string>;
  folderLinksMap: Record<string, LinkType[]>;
  isReadOnly: boolean;
  visibleLinksFlat: Array<{ link: LinkType; index: number }>;
  onFolderToggle: (id: string) => void;
  onFolderClick: (id: string) => void;
  onFolderRename: (id: string, name: string) => void;
  onFolderStartRename: (id: string) => void;
  onFolderCancelRename: () => void;
  onFolderContextMenu: (e: React.MouseEvent, folderId: string) => void;
  onLinkClick: (id: string) => void;
  onLinkCheckbox: (id: string, index: number, shiftKey: boolean) => void;
  onLinkContextMenu: (e: React.MouseEvent, linkId: string) => void;
}

const FolderSubtree = ({
  folder,
  depth,
  allFolders,
  expandedFolders,
  renamingFolderId,
  activeFolderId,
  activeLinkId,
  selectedLinkIds,
  folderLinksMap,
  isReadOnly,
  visibleLinksFlat,
  onFolderToggle,
  onFolderClick,
  onFolderRename,
  onFolderStartRename,
  onFolderCancelRename,
  onFolderContextMenu,
  onLinkClick,
  onLinkCheckbox,
  onLinkContextMenu,
}: FolderSubtreeProps) => {
  const isExpanded = expandedFolders.has(folder.id);
  const children = allFolders.filter((f) => f.parentFolderId === folder.id);
  const folderLinks = folderLinksMap[folder.id] ?? [];

  return (
    <div>
      <DraggableFolderRow
        folder={folder}
        depth={depth}
        isExpanded={isExpanded}
        isSelected={activeFolderId === folder.id}
        isRenaming={renamingFolderId === folder.id}
        isReadOnly={isReadOnly}
        onToggle={onFolderToggle}
        onClick={onFolderClick}
        onRename={onFolderRename}
        onStartRename={onFolderStartRename}
        onCancelRename={onFolderCancelRename}
        onContextMenu={onFolderContextMenu}
      />
      {isExpanded && (
        <div>
          {folderLinks.map((link) => {
            const flatEntry = visibleLinksFlat.find((e) => e.link.id === link.id);
            const flatIndex = flatEntry?.index ?? 0;
            return (
              <DraggableLinkRow
                key={link.id}
                link={link}
                index={flatIndex}
                depth={depth + 1}
                isSelected={selectedLinkIds.has(link.id)}
                isActive={activeLinkId === link.id}
                onItemClick={onLinkClick}
                onCheckboxClick={onLinkCheckbox}
                onContextMenu={onLinkContextMenu}
                isReadOnly={isReadOnly}
              />
            );
          })}
          {children.map((child) => (
            <FolderSubtree
              key={child.id}
              folder={child}
              depth={depth + 1}
              allFolders={allFolders}
              expandedFolders={expandedFolders}
              renamingFolderId={renamingFolderId}
              activeFolderId={activeFolderId}
              activeLinkId={activeLinkId}
              selectedLinkIds={selectedLinkIds}
              folderLinksMap={folderLinksMap}
              isReadOnly={isReadOnly}
              visibleLinksFlat={visibleLinksFlat}
              onFolderToggle={onFolderToggle}
              onFolderClick={onFolderClick}
              onFolderRename={onFolderRename}
              onFolderStartRename={onFolderStartRename}
              onFolderCancelRename={onFolderCancelRename}
              onFolderContextMenu={onFolderContextMenu}
              onLinkClick={onLinkClick}
              onLinkCheckbox={onLinkCheckbox}
              onLinkContextMenu={onLinkContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── DragOverlay content ──────────────────────────────────────────────────────

const LinkDragOverlayContent = ({ links }: { links: LinkType[] }) => {
  if (links.length === 1) {
    const link = links[0];
    return (
      <div className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl px-3 py-2 flex items-center gap-2 max-w-[240px] cursor-grabbing">
        <GripVertical size={12} className="text-slate-400 flex-shrink-0" />
        <span className="text-[13px] text-slate-700 dark:text-slate-200 truncate">
          {link.title || link.url}
        </span>
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 shadow-xl px-3 py-2 cursor-grabbing">
      <span className="text-[13px] font-medium text-indigo-700 dark:text-indigo-300">
        {links.length} links
      </span>
    </div>
  );
};

const FolderDragOverlayContent = ({ folder }: { folder: Folder }) => (
  <div className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl px-3 py-2 flex items-center gap-2 cursor-grabbing">
    <FolderIcon size={13} className="text-indigo-400 flex-shrink-0" />
    <span className="text-[13px] text-slate-700 dark:text-slate-200 truncate max-w-[180px]">
      {folder.name}
    </span>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const FolderTreePane = ({
  stashId,
  accessToken,
  folders,
  activeFolderId,
  activeLinkId,
  selectedLinkIds,
  onSelectionChange,
  onSelectAll,
  isReadOnly,
  onFolderSelect,
  onLinkActivate,
  onFolderDeleted,
  emptyState,
}: FolderTreePaneProps) => {
  const queryClient = useQueryClient();

  // ─── State ──────────────────────────────────────────────────────────────────

  const [lastSelectedIdx, setLastSelectedIdx] = useState<number | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createParentFolderId, setCreateParentFolderId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [folderPickerForLinks, setFolderPickerForLinks] = useState<string[] | null>(null);
  const [folderPickerForFolder, setFolderPickerForFolder] = useState<string | null>(null);
  const [draggingType, setDraggingType] = useState<'link' | 'folder' | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);

  // Refs for accessing latest values in callbacks without stale closures
  const dropTargetRef = useRef<DropTarget>(null);
  const selectedLinkIdsRef = useRef(selectedLinkIds);
  const rootLinksRef = useRef<LinkType[]>([]);
  const folderLinksMapRef = useRef<Record<string, LinkType[]>>({});
  const foldersRef = useRef(folders);
  const visibleLinksFlatRef = useRef<Array<{ link: LinkType; index: number }>>([]);

  dropTargetRef.current = dropTarget;
  selectedLinkIdsRef.current = selectedLinkIds;
  foldersRef.current = folders;

  // Stable wrapper so internal callbacks can use setSelectedLinkIds(prev => ...)
  // without capturing a stale selectedLinkIds. Reads the ref, which is always current.
  const setSelectedLinkIds = useCallback(
    (updater: Set<string> | ((prev: Set<string>) => Set<string>)) => {
      if (typeof updater === 'function') {
        onSelectionChange(updater(selectedLinkIdsRef.current));
      } else {
        onSelectionChange(updater);
      }
    },
    [onSelectionChange],
  );

  // ─── Data fetching ───────────────────────────────────────────────────────────

  const expandedFolderIds = Array.from(expandedFolders);

  const folderResults = useQueries({
    queries: [
      {
        queryKey: ['links', stashId, 'folder', 'root', 'tree'] as const,
        queryFn: () =>
          linkApi.listLinks(stashId, accessToken, undefined, 0, 100, 'root').then((r) => r.data.content),
        enabled: !!accessToken,
      },
      ...expandedFolderIds.map((folderId) => ({
        queryKey: ['links', stashId, 'folder', folderId, 'tree'] as const,
        queryFn: () =>
          linkApi
            .listLinks(stashId, accessToken, undefined, 0, 100, folderId)
            .then((r) => r.data.content),
        enabled: !!accessToken,
      })),
    ],
  });

  const rootLinks: LinkType[] = (folderResults[0]?.data as LinkType[] | undefined) ?? [];
  const folderLinksMap: Record<string, LinkType[]> = {};
  expandedFolderIds.forEach((folderId, i) => {
    folderLinksMap[folderId] = (folderResults[i + 1]?.data as LinkType[] | undefined) ?? [];
  });

  rootLinksRef.current = rootLinks;
  folderLinksMapRef.current = folderLinksMap;

  // Build flat visible link list for range selection
  const visibleLinksFlat: Array<{ link: LinkType; index: number }> = [];
  rootLinks.forEach((link) => visibleLinksFlat.push({ link, index: visibleLinksFlat.length }));
  const rootFolders = folders.filter((f) => !f.parentFolderId);
  const collectSubtreeLinks = (folderId: string) => {
    if (!expandedFolders.has(folderId)) return;
    (folderLinksMap[folderId] ?? []).forEach((link) =>
      visibleLinksFlat.push({ link, index: visibleLinksFlat.length }),
    );
    folders.filter((f) => f.parentFolderId === folderId).forEach((c) => collectSubtreeLinks(c.id));
  };
  rootFolders.forEach((f) => collectSubtreeLinks(f.id));
  visibleLinksFlatRef.current = visibleLinksFlat;

  // ─── Mutations ───────────────────────────────────────────────────────────────

  const renameMutation = useMutation({
    mutationFn: ({ folderId, name }: { folderId: string; name: string }) =>
      folderApi.renameFolder(stashId, accessToken, folderId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', stashId] });
      setRenamingFolderId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (folderId: string) => folderApi.deleteFolder(stashId, accessToken, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', stashId] });
      queryClient.invalidateQueries({ queryKey: ['links', stashId] });
      setConfirmDeleteId(null);
      onFolderDeleted();
    },
  });

  const createMutation = useMutation({
    mutationFn: ({ name, parentFolderId }: { name: string; parentFolderId: string | null }) =>
      folderApi.createFolder(stashId, accessToken, { name, parentFolderId }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['folders', stashId] });
      setShowCreateModal(false);
      if (vars.parentFolderId) {
        setExpandedFolders((prev) => new Set([...prev, vars.parentFolderId!]));
      }
    },
  });

  const moveFolderMutation = useMutation({
    mutationFn: ({
      folderId,
      newParentFolderId,
      insertAfterId,
    }: {
      folderId: string;
      newParentFolderId: string | null;
      insertAfterId: string | null;
    }) =>
      folderApi.moveFolder(stashId, accessToken, folderId, { newParentFolderId, insertAfterId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', stashId] });
      queryClient.invalidateQueries({ queryKey: ['links', stashId] });
    },
  });

  const moveLinkMutation = useMutation({
    mutationFn: ({ linkId, folderId }: { linkId: string; folderId: string | null }) =>
      folderApi.moveLinkToFolder(stashId, accessToken, linkId, { folderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', stashId] });
    },
  });

  const reorderLinksMutation = useMutation({
    mutationFn: ({ linkIds, insertAfterId }: { linkIds: string[]; insertAfterId: string | null }) =>
      linkApi.reorderLinks(stashId, accessToken, linkIds, insertAfterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', stashId] });
    },
  });

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleToggle = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.has(folderId) ? next.delete(folderId) : next.add(folderId);
      return next;
    });
  }, []);

  const handleFolderClick = useCallback(
    (folderId: string) => onFolderSelect(folderId),
    [onFolderSelect],
  );

  const handleLinkClick = useCallback(
    (linkId: string) => {
      const link = visibleLinksFlatRef.current.find((e) => e.link.id === linkId)?.link;
      onLinkActivate(linkId, link);
      setSelectedLinkIds(new Set([linkId]));
    },
    [onLinkActivate],
  );

  const handleLinkCheckbox = useCallback(
    (linkId: string, index: number, shiftKey: boolean) => {
      if (shiftKey && lastSelectedIdx !== null) {
        const lo = Math.min(lastSelectedIdx, index);
        const hi = Math.max(lastSelectedIdx, index);
        const rangeIds = visibleLinksFlatRef.current.slice(lo, hi + 1).map((e) => e.link.id);
        setSelectedLinkIds((prev) => {
          const next = new Set(prev);
          if (prev.has(linkId)) rangeIds.forEach((id) => next.delete(id));
          else rangeIds.forEach((id) => next.add(id));
          return next;
        });
      } else {
        setSelectedLinkIds((prev) => {
          const next = new Set(prev);
          next.has(linkId) ? next.delete(linkId) : next.add(linkId);
          return next;
        });
        setLastSelectedIdx(index);
      }
    },
    [lastSelectedIdx],
  );

  const handleLinkContextMenu = useCallback((e: React.MouseEvent, linkId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'link', id: linkId });
  }, []);

  const handleFolderContextMenu = useCallback((e: React.MouseEvent, folderId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'folder', id: folderId });
  }, []);

  const moveLinksToFolder = useCallback(
    async (linkIds: string[], folderId: string | null) => {
      await Promise.all(linkIds.map((linkId) => moveLinkMutation.mutateAsync({ linkId, folderId })));
    },
    [moveLinkMutation],
  );

  // ─── Keyboard navigation ──────────────────────────────────────────────────────

  const treeRef = useRef<HTMLDivElement>(null);

  const scrollLinkIntoView = useCallback((linkId: string) => {
    treeRef.current?.querySelector(`[data-link-id="${linkId}"]`)?.scrollIntoView({ block: 'nearest' });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const flat = visibleLinksFlatRef.current;
      if (flat.length === 0) return;

      const currentIdx = activeLinkId ? flat.findIndex((e) => e.link.id === activeLinkId) : -1;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const nextIdx = e.key === 'ArrowDown'
          ? Math.min(currentIdx + 1, flat.length - 1)
          : Math.max(currentIdx - 1, 0);
        const nextLink = flat[nextIdx]?.link;
        if (!nextLink) return;

        if (e.shiftKey) {
          setSelectedLinkIds((prev) => {
            const next = new Set(prev);
            // Add the new link; if moving back over an already-selected link remove it
            if (next.has(nextLink.id) && currentIdx !== -1) {
              next.delete(flat[currentIdx].link.id);
            } else {
              next.add(nextLink.id);
            }
            return next;
          });
        } else if (!e.shiftKey) {
          setSelectedLinkIds(new Set([nextLink.id]));
        }

        onLinkActivate(nextLink.id, nextLink);
        setLastSelectedIdx(nextIdx);
        scrollLinkIntoView(nextLink.id);
      } else if (e.key === ' ') {
        e.preventDefault();
        if (currentIdx === -1 || !activeLinkId) return;
        setSelectedLinkIds((prev) => {
          const next = new Set(prev);
          next.has(activeLinkId) ? next.delete(activeLinkId) : next.add(activeLinkId);
          return next;
        });
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        onSelectAll();
      } else if (e.key === 'Escape') {
        setSelectedLinkIds(new Set());
      }
    },
    [activeLinkId, onLinkActivate, scrollLinkIntoView, onSelectAll],
  );

  // ─── DnD ─────────────────────────────────────────────────────────────────────

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const data = event.active.data.current as
        | { type: 'link'; link: LinkType }
        | { type: 'folder'; folder: Folder }
        | undefined;
      if (!data) return;
      setDraggingType(data.type);
      setDraggingId(event.active.id as string);
      if (data.type === 'link' && !selectedLinkIdsRef.current.has(data.link.id)) {
        setSelectedLinkIds(new Set([data.link.id]));
      }
    },
    [],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) {
        setDropTarget(null);
        return;
      }

      const overId = over.id as string;
      const activeData = active.data.current as
        | { type: 'link'; link: LinkType; scopeFolderId: string | null }
        | { type: 'folder'; folder: Folder; parentFolderId: string | null }
        | undefined;
      if (!activeData) return;

      const overRect = over.rect;
      const activeTranslated = active.rect.current.translated;
      if (!activeTranslated) return;
      const draggedCenterY = activeTranslated.top + activeTranslated.height / 2;

      if (overId.startsWith('folder:')) {
        const folderId = overId.replace('folder:', '');
        const folder = foldersRef.current.find((f) => f.id === folderId);
        if (!folder) { setDropTarget(null); return; }

        if (activeData.type === 'link') {
          setDropTarget({ kind: 'into-folder', folderId });
        } else {
          // Prevent dropping folder into itself or its own descendants
          const draggingFolderId = (activeData as { folder: Folder }).folder.id;
          if (folderId === draggingFolderId) { setDropTarget(null); return; }

          const topThird = overRect.top + overRect.height / 3;
          const bottomThird = overRect.top + (overRect.height * 2) / 3;
          if (draggedCenterY < topThird) {
            setDropTarget({ kind: 'before-folder', folderId, parentFolderId: folder.parentFolderId ?? null });
          } else if (draggedCenterY > bottomThird) {
            setDropTarget({ kind: 'after-folder', folderId, parentFolderId: folder.parentFolderId ?? null });
          } else {
            setDropTarget({ kind: 'into-folder', folderId });
          }
        }
      } else if (overId.startsWith('link:') && activeData.type === 'link') {
        const linkId = overId.replace('link:', '');
        const linkEntry = visibleLinksFlatRef.current.find((e) => e.link.id === linkId);
        if (!linkEntry) { setDropTarget(null); return; }

        const overCenter = overRect.top + overRect.height / 2;
        const scopeFolderId = linkEntry.link.folderId ?? null;
        setDropTarget(
          draggedCenterY < overCenter
            ? { kind: 'before-link', linkId, scopeFolderId }
            : { kind: 'after-link', linkId, scopeFolderId },
        );
      } else {
        setDropTarget(null);
      }
    },
    [],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const dt = dropTargetRef.current;
      setDraggingType(null);
      setDraggingId(null);
      setDropTarget(null);

      if (!dt) return;
      const activeData = event.active.data.current as
        | { type: 'link'; link: LinkType }
        | { type: 'folder'; folder: Folder }
        | undefined;
      if (!activeData) return;

      const allFolders = foldersRef.current;

      if (activeData.type === 'folder') {
        const folder = activeData.folder;
        if (dt.kind === 'into-folder') {
          if (dt.folderId !== folder.id) {
            moveFolderMutation.mutate({ folderId: folder.id, newParentFolderId: dt.folderId, insertAfterId: null });
          }
        } else if (dt.kind === 'before-folder' || dt.kind === 'after-folder') {
          const siblingFolders = allFolders.filter(
            (f) => (f.parentFolderId ?? null) === dt.parentFolderId,
          );
          const idx = siblingFolders.findIndex((f) => f.id === dt.folderId);
          const insertAfterId =
            dt.kind === 'after-folder'
              ? dt.folderId
              : idx > 0
              ? siblingFolders[idx - 1].id
              : null;
          moveFolderMutation.mutate({
            folderId: folder.id,
            newParentFolderId: dt.parentFolderId,
            insertAfterId,
          });
        }
        return;
      }

      if (activeData.type === 'link') {
        const sel = selectedLinkIdsRef.current;
        const linkIds = sel.has(activeData.link.id) ? Array.from(sel) : [activeData.link.id];

        if (dt.kind === 'into-folder') {
          moveLinksToFolder(linkIds, dt.folderId);
        } else if (dt.kind === 'before-link' || dt.kind === 'after-link') {
          const scopeLinks = dt.scopeFolderId
            ? (folderLinksMapRef.current[dt.scopeFolderId] ?? [])
            : rootLinksRef.current;
          const idx = scopeLinks.findIndex((l) => l.id === dt.linkId);
          const insertAfterId =
            dt.kind === 'after-link'
              ? dt.linkId
              : idx > 0
              ? scopeLinks[idx - 1].id
              : null;
          Promise.all(
            linkIds.map((id) =>
              moveLinkMutation.mutateAsync({ linkId: id, folderId: dt.scopeFolderId }),
            ),
          ).then(() => reorderLinksMutation.mutate({ linkIds, insertAfterId }));
        }
      }
    },
    [moveFolderMutation, moveLinksToFolder, moveLinkMutation, reorderLinksMutation],
  );

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2' && activeFolderId && !isReadOnly) {
        e.preventDefault();
        setRenamingFolderId(activeFolderId);
      } else if (e.key === 'Delete' && activeFolderId && !isReadOnly) {
        e.preventDefault();
        setConfirmDeleteId(activeFolderId);
      } else if (e.key === 'Escape') {
        setRenamingFolderId(null);
        setConfirmDeleteId(null);
        setContextMenu(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N' && !isReadOnly) {
        e.preventDefault();
        setCreateParentFolderId(activeFolderId);
        setShowCreateModal(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeFolderId, isReadOnly]);

  // ─── Context menu items ───────────────────────────────────────────────────────

  const buildLinkContextMenu = (linkId: string): ContextMenuEntry[] => {
    const link = visibleLinksFlat.find((e) => e.link.id === linkId)?.link;
    if (!link) return [];
    const affectedIds =
      selectedLinkIds.has(linkId) && selectedLinkIds.size > 1
        ? Array.from(selectedLinkIds)
        : [linkId];

    const items: ContextMenuEntry[] = [
      {
        label: 'Open link',
        icon: <ExternalLink size={13} />,
        onClick: () => window.open(link.url, '_blank', 'noopener,noreferrer'),
      },
      { separator: true as const },
      {
        label: affectedIds.length > 1 ? `Move ${affectedIds.length} links to folder…` : 'Move to folder…',
        icon: <FolderInput size={13} />,
        onClick: () => setFolderPickerForLinks(affectedIds),
      },
    ];

    if (link.folderId != null) {
      items.push({
        label: 'Move to root',
        icon: <FolderIcon size={13} />,
        onClick: () => moveLinksToFolder(affectedIds, null),
      });
    }

    return items;
  };

  const buildFolderContextMenu = (folderId: string): ContextMenuEntry[] => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return [];

    const items: ContextMenuEntry[] = [
      {
        label: 'New subfolder',
        icon: <FolderPlus size={13} />,
        onClick: () => { setCreateParentFolderId(folderId); setShowCreateModal(true); },
      },
      {
        label: 'Rename',
        icon: <Pencil size={13} />,
        onClick: () => setRenamingFolderId(folderId),
      },
      {
        label: 'Move to folder…',
        icon: <FolderInput size={13} />,
        onClick: () => setFolderPickerForFolder(folderId),
      },
    ];

    if (folder.parentFolderId != null) {
      items.push({
        label: 'Move to root',
        icon: <FolderIcon size={13} />,
        onClick: () => moveFolderMutation.mutate({ folderId, newParentFolderId: null, insertAfterId: null }),
      });
    }

    items.push(
      { separator: true as const },
      { label: 'Delete', icon: <Trash2 size={13} />, danger: true, onClick: () => setConfirmDeleteId(folderId) },
    );

    return items;
  };

  // ─── Derived state ────────────────────────────────────────────────────────────

  const confirmDeleteFolder = folders.find((f) => f.id === confirmDeleteId);
  const draggingLinkIds: Set<string> = draggingType === 'link' ? selectedLinkIds : new Set<string>();

  let activeDragLink: LinkType | null = null;
  let activeDragFolder: Folder | null = null;
  if (draggingId) {
    if (draggingType === 'link') {
      const linkId = draggingId.replace('link:', '');
      activeDragLink = visibleLinksFlat.find((e) => e.link.id === linkId)?.link ?? null;
    } else if (draggingType === 'folder') {
      const folderId = draggingId.replace('folder:', '');
      activeDragFolder = folders.find((f) => f.id === folderId) ?? null;
    }
  }

  const dragCtxValue: DragCtxValue = { dropTarget, draggingType, draggingIds: draggingLinkIds };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <DragCtx.Provider value={dragCtxValue}>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-col h-full">
          <div
            ref={treeRef}
            role="tree"
            tabIndex={0}
            className="flex-1 overflow-y-auto outline-none"
            onClick={() => onFolderSelect(null)}
            onKeyDown={handleKeyDown}
          >
            {rootFolders.map((folder) => (
              <FolderSubtree
                key={folder.id}
                folder={folder}
                depth={0}
                allFolders={folders}
                expandedFolders={expandedFolders}
                renamingFolderId={renamingFolderId}
                activeFolderId={activeFolderId}
                activeLinkId={activeLinkId}
                selectedLinkIds={selectedLinkIds}
                folderLinksMap={folderLinksMap}
                isReadOnly={isReadOnly}
                visibleLinksFlat={visibleLinksFlat}
                onFolderToggle={handleToggle}
                onFolderClick={handleFolderClick}
                onFolderRename={(id, name) => renameMutation.mutate({ folderId: id, name })}
                onFolderStartRename={setRenamingFolderId}
                onFolderCancelRename={() => setRenamingFolderId(null)}
                onFolderContextMenu={handleFolderContextMenu}
                onLinkClick={handleLinkClick}
                onLinkCheckbox={handleLinkCheckbox}
                onLinkContextMenu={handleLinkContextMenu}
              />
            ))}

            {rootLinks.map((link) => {
              const flatEntry = visibleLinksFlat.find((e) => e.link.id === link.id);
              return (
                <DraggableLinkRow
                  key={link.id}
                  link={link}
                  index={flatEntry?.index ?? 0}
                  isSelected={selectedLinkIds.has(link.id)}
                  isActive={activeLinkId === link.id}
                  onItemClick={handleLinkClick}
                  onCheckboxClick={handleLinkCheckbox}
                  onContextMenu={handleLinkContextMenu}
                  isReadOnly={isReadOnly}
                />
              );
            })}

            {emptyState && rootLinks.length === 0 && rootFolders.length === 0 && emptyState}
          </div>

          <div className="flex items-center gap-1 px-2 py-1.5 border-t border-slate-200/50 dark:border-slate-800/50">
            {!isReadOnly && (
              <button
                title="New folder (Ctrl+Shift+N)"
                onClick={() => { setCreateParentFolderId(activeFolderId); setShowCreateModal(true); }}
                className="flex items-center gap-1 px-2 py-1 rounded text-[12px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Plus size={12} />
                New folder
              </button>
            )}
            <div className="flex items-center gap-0.5 ml-auto">
              <button
                title="Expand all folders"
                onClick={() => setExpandedFolders(new Set(folders.map((f) => f.id)))}
                disabled={folders.length === 0}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronsUpDown size={13} />
              </button>
              <button
                title="Collapse all folders"
                onClick={() => setExpandedFolders(new Set())}
                disabled={expandedFolders.size === 0}
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronsDownUp size={13} />
              </button>
              {!isReadOnly && activeFolderId && (
                <button
                  title="Delete folder (Delete)"
                  onClick={() => setConfirmDeleteId(activeFolderId)}
                  className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>

          {showCreateModal && (
            <CreateFolderModal
              parentFolderName={
                createParentFolderId ? folders.find((f) => f.id === createParentFolderId)?.name : undefined
              }
              onConfirm={(name) => createMutation.mutate({ name, parentFolderId: createParentFolderId })}
              onCancel={() => setShowCreateModal(false)}
            />
          )}

          {confirmDeleteId && confirmDeleteFolder && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
              onClick={(e) => { if (e.target === e.currentTarget) setConfirmDeleteId(null); }}
            >
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-2">Delete folder?</h2>
                <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-4">
                  <strong>{confirmDeleteFolder.name}</strong> and all its sub-folders will be deleted. Links inside will be moved to the root.
                </p>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(confirmDeleteId)}
                    disabled={deleteMutation.isPending}
                    className="px-4 py-2 rounded-lg text-sm bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {contextMenu && !isReadOnly && (
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              items={
                contextMenu.type === 'link'
                  ? buildLinkContextMenu(contextMenu.id)
                  : buildFolderContextMenu(contextMenu.id)
              }
              onClose={() => setContextMenu(null)}
            />
          )}

          {folderPickerForLinks && !isReadOnly && (
            <FolderPickerModal
              folders={folders}
              currentFolderId={(() => {
                const link = visibleLinksFlat.find((e) => e.link.id === folderPickerForLinks[0])?.link;
                return link?.folderId ?? null;
              })()}
              title={folderPickerForLinks.length > 1 ? `Move ${folderPickerForLinks.length} links to folder` : 'Move to folder'}
              onSelect={(folderId) => { moveLinksToFolder(folderPickerForLinks, folderId); setFolderPickerForLinks(null); }}
              onCancel={() => setFolderPickerForLinks(null)}
            />
          )}

          {folderPickerForFolder && !isReadOnly && (
            <FolderPickerModal
              folders={folders.filter((f) => f.id !== folderPickerForFolder)}
              currentFolderId={folders.find((f) => f.id === folderPickerForFolder)?.parentFolderId ?? null}
              title="Move folder to"
              onSelect={(newParentFolderId) => {
                moveFolderMutation.mutate({ folderId: folderPickerForFolder, newParentFolderId, insertAfterId: null });
                setFolderPickerForFolder(null);
              }}
              onCancel={() => setFolderPickerForFolder(null)}
            />
          )}
        </div>

        <DragOverlay dropAnimation={null}>
          {draggingType === 'link' && activeDragLink ? (
            <LinkDragOverlayContent
              links={
                selectedLinkIds.has(activeDragLink.id) && selectedLinkIds.size > 1
                  ? Array.from(selectedLinkIds)
                      .map((id) => visibleLinksFlat.find((e) => e.link.id === id)?.link)
                      .filter((l): l is LinkType => l != null)
                  : [activeDragLink]
              }
            />
          ) : draggingType === 'folder' && activeDragFolder ? (
            <FolderDragOverlayContent folder={activeDragFolder} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </DragCtx.Provider>
  );
};
