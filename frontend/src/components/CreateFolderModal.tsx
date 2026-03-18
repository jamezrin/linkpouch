import React, { useState, useRef, useEffect } from 'react';

interface CreateFolderModalProps {
  parentFolderName?: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export const CreateFolderModal = ({ parentFolderName, onConfirm, onCancel }: CreateFolderModalProps) => {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      onConfirm(trimmed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-1">
          New folder
        </h2>
        {parentFolderName && (
          <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-4">
            Inside <span className="font-medium">{parentFolderName}</span>
          </p>
        )}

        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Folder name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={255}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 mb-4"
          />

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 rounded-lg text-sm bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
