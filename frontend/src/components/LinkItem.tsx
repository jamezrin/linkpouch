import React, { useState } from 'react';
import { Link } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const getFaviconUrl = (url: string, provided?: string): string | null => {
  if (provided) return provided;
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return null;
  }
};

export const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('en', { month: 'short', day: 'numeric' });

// ─── CheckIcon ────────────────────────────────────────────────────────────────

const CheckIcon = () => (
  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

// ─── Props ────────────────────────────────────────────────────────────────────

export interface LinkItemProps {
  link: Link;
  isSelected: boolean;
  isActive: boolean;
  index: number;
  depth?: number;
  onItemClick: (id: string) => void;
  onCheckboxClick: (id: string, index: number, shiftKey: boolean) => void;
  isDragDisabled: boolean;
  isGroupDragging: boolean;
  onContextMenu?: (e: React.MouseEvent) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const LinkItem = ({
  link,
  isSelected,
  isActive,
  index,
  depth = 0,
  onItemClick,
  onCheckboxClick,
  isDragDisabled,
  isGroupDragging,
  onContextMenu,
}: LinkItemProps) => {
  const [hovered, setHovered] = useState(false);
  const showCheckbox = hovered || isSelected;
  const faviconUrl = getFaviconUrl(link.url, link.faviconUrl);
  const paddingLeft = depth * 16 + 12;
  const depthBorderClass =
    depth > 0 && !isActive
      ? 'border-l-2 border-l-indigo-200 dark:border-l-indigo-800'
      : '';

  return (
    <div
      role="option"
      aria-selected={isSelected}
      className={[
        'relative flex items-center gap-2 pr-3 py-2.5 select-none',
        isDragDisabled ? 'cursor-pointer' : 'cursor-grab',
        'border-b border-slate-200/50 dark:border-slate-800/50 transition-colors duration-100',
        depthBorderClass,
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
      style={{ paddingLeft }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={onContextMenu}
      onClick={(e) => {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          onCheckboxClick(link.id, index, e.shiftKey);
        } else {
          onItemClick(link.id);
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
        <p
          className={`text-[13px] font-medium truncate leading-tight ${
            !link.status || link.status === 'PENDING'
              ? 'text-slate-400 italic'
              : 'text-slate-800 dark:text-slate-200'
          }`}
        >
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
