import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, Folder as FolderIcon } from 'lucide-react';
import { Folder } from '../types';

interface FolderItemProps {
  folder: Folder;
  isExpanded: boolean;
  isSelected: boolean;
  depth: number;
  linkCount?: number;
  onToggle: (folderId: string) => void;
  onClick: (folderId: string) => void;
  onRename: (folderId: string, newName: string) => void;
  isRenaming: boolean;
  onStartRename: (folderId: string) => void;
  onCancelRename: () => void;
  isDropTarget?: boolean;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const FolderItem = ({
  folder,
  isExpanded,
  isSelected,
  depth,
  linkCount,
  onToggle,
  onClick,
  onRename,
  isRenaming,
  onStartRename,
  onCancelRename,
  isDropTarget,
  onContextMenu,
}: FolderItemProps) => {
  const [renameValue, setRenameValue] = useState(folder.name);
  const inputRef = useRef<HTMLInputElement>(null);

  // When rename starts, reset the value and auto-select text.
  useEffect(() => {
    if (isRenaming) {
      setRenameValue(folder.name);
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [isRenaming]); // eslint-disable-line react-hooks/exhaustive-deps
  // folder.name intentionally excluded: we only want to reset when rename mode
  // opens, not while the user is typing (which would clobber their edits).

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== folder.name) {
      onRename(folder.id, trimmed);
    } else {
      onCancelRename();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancelRename();
    }
  };

  const paddingLeft = depth * 16 + 8;

  return (
    <div
      role="treeitem"
      aria-expanded={isExpanded}
      aria-selected={isSelected}
      className={[
        'flex items-center gap-1.5 py-2 pr-3 select-none cursor-pointer',
        'border-b border-slate-200/50 dark:border-slate-800/50 transition-colors duration-100',
        isSelected
          ? 'bg-indigo-500/20 border-l-2 border-l-indigo-400'
          : 'hover:bg-slate-100 dark:hover:bg-white/[0.04]',
        isDropTarget ? 'ring-2 ring-indigo-400 ring-inset' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ paddingLeft }}
      onClick={() => {
        if (!isRenaming) {
          onClick(folder.id);
        }
      }}
      onDoubleClick={() => {
        if (!isRenaming) {
          onStartRename(folder.id);
        }
      }}
      onContextMenu={onContextMenu}
    >
      <button
        className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        onClick={(e) => {
          e.stopPropagation();
          onToggle(folder.id);
        }}
        aria-label={isExpanded ? 'Collapse' : 'Expand'}
      >
        <ChevronRight
          size={14}
          className={`transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
        />
      </button>

      <FolderIcon
        size={14}
        className={`flex-shrink-0 ${isExpanded ? 'text-indigo-400' : 'text-slate-400'}`}
      />

      {isRenaming ? (
        <input
          ref={inputRef}
          className="flex-1 text-[13px] bg-transparent border-b border-indigo-400 outline-none text-slate-800 dark:text-slate-100 min-w-0"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleRenameSubmit}
          onClick={(e) => e.stopPropagation()}
          maxLength={255}
        />
      ) : (
        <span className="flex-1 text-[13px] text-slate-700 dark:text-slate-200 truncate leading-tight">
          {folder.name}
        </span>
      )}

      {!isRenaming && linkCount !== undefined && linkCount > 0 && (
        <span className="text-[11px] text-slate-400 flex-shrink-0">{linkCount}</span>
      )}
    </div>
  );
};
