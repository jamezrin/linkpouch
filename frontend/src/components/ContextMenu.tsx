import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface ContextMenuSeparator {
  separator: true;
}

export type ContextMenuEntry = ContextMenuItem | ContextMenuSeparator;

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuEntry[];
  onClose: () => void;
}

export const ContextMenu = ({ x, y, items, onClose }: ContextMenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Adjust position to stay within viewport
  const menuWidth = 220;
  const adjustedX = x + menuWidth > window.innerWidth ? Math.max(0, window.innerWidth - menuWidth - 8) : x;

  // We estimate height and adjust after mount
  const [adjustedY, setAdjustedY] = React.useState(y);

  useEffect(() => {
    if (menuRef.current) {
      const menuHeight = menuRef.current.offsetHeight;
      if (y + menuHeight > window.innerHeight) {
        setAdjustedY(Math.max(0, window.innerHeight - menuHeight - 8));
      } else {
        setAdjustedY(y);
      }
    }
  }, [y, items]);

  // Close on outside click or Escape
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const menu = (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 min-w-[180px]"
      style={{ left: adjustedX, top: adjustedY, width: menuWidth }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) => {
        if ('separator' in item) {
          return <hr key={i} className="my-1 border-slate-200 dark:border-slate-700" />;
        }
        return (
          <button
            key={i}
            disabled={item.disabled}
            className={[
              'w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-left transition-colors',
              item.disabled
                ? 'opacity-40 cursor-not-allowed'
                : item.danger
                ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer'
                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => {
              if (!item.disabled) {
                item.onClick();
                onClose();
              }
            }}
          >
            {item.icon && (
              <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                {item.icon}
              </span>
            )}
            {item.label}
          </button>
        );
      })}
    </div>
  );

  return createPortal(menu, document.body);
};
