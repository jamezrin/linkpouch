import { useState } from 'react';
import { Home, ChevronRight, Folder as FolderIcon } from 'lucide-react';
import { Folder } from '../types';

interface FolderPickerModalProps {
  folders: Folder[];
  currentFolderId: string | null; // current folder of the items being moved (disabled)
  onSelect: (folderId: string | null) => void; // null = move to root
  onCancel: () => void;
  title?: string;
}

interface FolderRowProps {
  folder: Folder;
  depth: number;
  folders: Folder[];
  currentFolderId: string | null;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (folderId: string | null) => void;
}

const FolderRow = ({
  folder,
  depth,
  folders,
  currentFolderId,
  expandedIds,
  onToggle,
  onSelect,
}: FolderRowProps) => {
  const children = folders.filter((f) => f.parentFolderId === folder.id);
  const isExpanded = expandedIds.has(folder.id);
  const isDisabled = folder.id === currentFolderId;
  const hasChildren = children.length > 0;

  return (
    <>
      <button
        disabled={isDisabled}
        className={[
          'w-full flex items-center gap-1.5 py-1.5 pr-3 text-[13px] text-left transition-colors rounded',
          isDisabled
            ? 'opacity-40 cursor-not-allowed text-slate-500 dark:text-slate-400'
            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={() => {
          if (!isDisabled) {
            onSelect(folder.id);
          }
        }}
      >
        <button
          className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-slate-400"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(folder.id);
          }}
          tabIndex={-1}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {hasChildren ? (
            <ChevronRight
              size={12}
              className={`transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
            />
          ) : (
            <span className="w-3 h-3" />
          )}
        </button>
        <FolderIcon
          size={13}
          className={`flex-shrink-0 ${isExpanded ? 'text-indigo-400' : 'text-slate-400'}`}
        />
        <span className="truncate">{folder.name}</span>
      </button>
      {isExpanded &&
        children.map((child) => (
          <FolderRow
            key={child.id}
            folder={child}
            depth={depth + 1}
            folders={folders}
            currentFolderId={currentFolderId}
            expandedIds={expandedIds}
            onToggle={onToggle}
            onSelect={onSelect}
          />
        ))}
    </>
  );
};

export const FolderPickerModal = ({
  folders,
  currentFolderId,
  onSelect,
  onCancel,
  title = 'Move to folder',
}: FolderPickerModalProps) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const rootFolders = folders.filter((f) => !f.parentFolderId);

  const handleToggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-4">
          {title}
        </h2>

        <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-1 mb-4">
          {/* Root option */}
          <button
            disabled={currentFolderId === null}
            className={[
              'w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-left rounded transition-colors',
              currentFolderId === null
                ? 'opacity-40 cursor-not-allowed text-slate-500 dark:text-slate-400'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => {
              if (currentFolderId !== null) onSelect(null);
            }}
          >
            <Home size={13} className="flex-shrink-0 text-slate-400" />
            <span>Root (no folder)</span>
          </button>

          {/* Folder tree */}
          {rootFolders.map((folder) => (
            <FolderRow
              key={folder.id}
              folder={folder}
              depth={0}
              folders={folders}
              currentFolderId={currentFolderId}
              expandedIds={expandedIds}
              onToggle={handleToggle}
              onSelect={onSelect}
            />
          ))}

          {rootFolders.length === 0 && currentFolderId !== null && (
            <p className="text-[12px] text-slate-400 dark:text-slate-500 text-center py-4">
              No folders available
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
