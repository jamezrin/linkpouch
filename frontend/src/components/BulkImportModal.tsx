import React, { useState, useEffect, useRef, useCallback } from 'react';
import { linkApi } from '../services/api';
import { BulkImportResponse } from '../types';

interface BulkImportModalProps {
  stashId: string;
  accessToken: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Tab = 'paste' | 'file';

function parseUrls(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('http://') || l.startsWith('https://'));
}

export function BulkImportModal({ stashId, accessToken, onClose, onSuccess }: BulkImportModalProps) {
  const [tab, setTab] = useState<Tab>('paste');
  const [pasteText, setPasteText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkImportResponse | null>(null);
  const [skippedOpen, setSkippedOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validUrls = tab === 'paste' ? parseUrls(pasteText) : fileUrls;
  const tooMany = validUrls.length > 100;

  const handleClose = useCallback(() => {
    if (!isLoading) onClose();
  }, [isLoading, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleClose]);

  const readFile = (file: File) => {
    if (!file.name.endsWith('.txt')) {
      setError('Please upload a .txt file');
      return;
    }
    setError(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setFileUrls(parseUrls(text));
    };
    reader.readAsText(file);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  };

  const handleImport = async () => {
    if (validUrls.length === 0 || tooMany || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await linkApi.addLinksBatch(stashId, accessToken, { urls: validUrls });
      setResult(res.data);
      if (res.data.imported > 0) onSuccess();
    } catch {
      setError('Import failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
              Bulk import
            </h2>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
              Add up to 100 links at once
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {result ? (
          /* ── Result view ── */
          <div className="px-5 py-5 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-[14px] font-medium text-slate-900 dark:text-slate-100">
                  {result.imported === 0
                    ? 'No new links imported'
                    : `${result.imported} link${result.imported === 1 ? '' : 's'} imported`}
                </p>
                {result.skipped > 0 && (
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {result.skipped} URL{result.skipped === 1 ? '' : 's'} skipped
                  </p>
                )}
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <button
                  onClick={() => setSkippedOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 text-[12px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <span>Skipped URLs ({result.errors.length})</span>
                  <svg
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform ${skippedOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {skippedOpen && (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-40 overflow-y-auto">
                    {result.errors.map((e, i) => (
                      <li key={i} className="px-3.5 py-2">
                        <p className="text-[12px] text-slate-700 dark:text-slate-300 truncate">{e.url}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{e.reason}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className="self-end px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[13px] font-medium transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          /* ── Import form ── */
          <>
            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 px-5">
              {(['paste', 'file'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`py-3 mr-5 text-[13px] font-medium border-b-2 transition-colors ${
                    tab === t
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {t === 'paste' ? 'Paste URLs' : 'Upload file'}
                </button>
              ))}
            </div>

            <div className="px-5 py-4 flex flex-col gap-3">
              {tab === 'paste' ? (
                <>
                  <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder={'https://example.com\nhttps://github.com\nhttps://…'}
                    rows={8}
                    className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-300/70 dark:border-slate-700/70 rounded-lg text-[13px] text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:border-indigo-500/70 focus:ring-indigo-500/20 resize-none font-mono"
                  />
                  <div className="flex items-center gap-2">
                    {validUrls.length > 0 && !tooMany && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-md text-[11px] font-medium">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {validUrls.length} valid URL{validUrls.length === 1 ? '' : 's'} detected
                      </span>
                    )}
                    {validUrls.length === 0 && pasteText.trim() && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        No valid URLs detected — each line must start with http:// or https://
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleFileDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex flex-col items-center justify-center gap-3 px-6 py-10 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                      isDragOver
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10'
                        : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <svg className={`w-8 h-8 ${isDragOver ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-600'} transition-colors`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {fileName ? (
                      <div className="text-center">
                        <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{fileName}</p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {fileUrls.length} valid URL{fileUrls.length === 1 ? '' : 's'} found — click to replace
                        </p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-[13px] text-slate-600 dark:text-slate-400">
                          Drop a <span className="font-medium">.txt</span> file here, or{' '}
                          <span className="text-indigo-600 dark:text-indigo-400 font-medium">browse</span>
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                          One URL per line
                        </p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt"
                      onChange={handleFileInput}
                      className="hidden"
                    />
                  </div>
                  {fileUrls.length > 0 && !tooMany && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-md text-[11px] font-medium w-fit">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {fileUrls.length} valid URL{fileUrls.length === 1 ? '' : 's'} detected
                    </span>
                  )}
                </>
              )}

              {tooMany && (
                <p className="text-[12px] text-red-500 dark:text-red-400">
                  Too many URLs — maximum is 100 (currently {validUrls.length})
                </p>
              )}
              {error && (
                <p className="text-[12px] text-red-500 dark:text-red-400">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="px-3.5 py-2 text-[13px] font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={validUrls.length === 0 || tooMany || isLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[13px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Importing…
                  </>
                ) : (
                  `Import${validUrls.length > 0 ? ` ${validUrls.length} URL${validUrls.length === 1 ? '' : 's'}` : ''}`
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
