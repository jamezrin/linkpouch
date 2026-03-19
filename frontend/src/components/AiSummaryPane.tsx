import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from '../types';

interface AiSummaryPaneProps {
  link: Link;
  onOpenSettings?: () => void;
}

export function AiSummaryPane({ link, onOpenSettings }: AiSummaryPaneProps) {
  const status = link.aiSummaryStatus ?? 'PENDING';

  const handleDownload = () => {
    if (!link.aiSummary) return;
    const blob = new Blob([link.aiSummary], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = (link.title ?? link.url).replace(/[^a-z0-9]/gi, '_').slice(0, 60);
    a.download = `${filename}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (status === 'PENDING' || status === 'GENERATING') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-500 dark:text-slate-400">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">
          {status === 'GENERATING' ? 'Generating AI summary…' : 'AI summary queued…'}
        </p>
      </div>
    );
  }

  if (status === 'FAILED') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-500 dark:text-slate-400 p-6 text-center">
        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <p className="text-sm font-medium text-red-500">AI summary failed</p>
        <p className="text-xs text-slate-400">
          The summarization encountered an error. Check your AI settings and try refreshing the link.
        </p>
      </div>
    );
  }

  if (status === 'SKIPPED' || !link.aiSummary) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
        <svg
          className="w-10 h-10 text-slate-300 dark:text-slate-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No AI summary available</p>
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
          >
            Configure AI in settings →
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{link.aiSummary}</ReactMarkdown>
        </div>
      </div>
      <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-700/50 px-4 py-2 flex justify-end">
        <button
          onClick={handleDownload}
          className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium flex items-center gap-1 transition-colors"
          title="Download as Markdown"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          Download .md
        </button>
      </div>
    </div>
  );
}
