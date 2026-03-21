import ReactMarkdown, { Components } from 'react-markdown';
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
    const steps = [
      { label: 'Fetching page content', active: status === 'PENDING', done: status === 'GENERATING' },
      { label: 'Generating AI summary', active: status === 'GENERATING', done: false },
    ];
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 px-6">
        <div className="w-full max-w-[220px] flex flex-col gap-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="relative flex-shrink-0 w-6 h-6 flex items-center justify-center">
                {step.done ? (
                  <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : step.active ? (
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-slate-200 dark:border-slate-700" />
                )}
              </div>
              <span className={`text-[13px] ${step.active ? 'text-slate-800 dark:text-slate-100 font-medium' : step.done ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-600'}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
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

  const markdownComponents: Components = {
            h1: ({ children }) => (
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-50 mt-5 mb-2 first:mt-0 border-b border-slate-200 dark:border-slate-700 pb-1">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-[15px] font-semibold text-slate-800 dark:text-slate-100 mt-5 mb-2 first:mt-0 border-b border-slate-100 dark:border-slate-700/60 pb-1">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 mt-4 mb-1.5">{children}</h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-[12px] font-semibold text-slate-600 dark:text-slate-300 mt-3 mb-1">{children}</h4>
            ),
            p: ({ children }) => (
              <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-300 mb-3">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="mb-3 space-y-1.5 pl-1">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="mb-3 space-y-1.5 pl-1 list-none counter-reset-[item]">{children}</ol>
            ),
            li: ({ children, ...props }) => {
              const ordered = (props as any).ordered as boolean | undefined;
              return (
                <li className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-300 flex gap-2.5 items-start">
                  {ordered
                    ? <span className="mt-[3px] flex-shrink-0 w-[5px] h-[5px] rounded-sm bg-indigo-400 dark:bg-indigo-500 rotate-45" />
                    : <span className="mt-[7px] flex-shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500" />
                  }
                  <span className="flex-1 min-w-0">{children}</span>
                </li>
              );
            },
            strong: ({ children }) => (
              <strong className="font-semibold text-slate-900 dark:text-slate-100">{children}</strong>
            ),
            em: ({ children }) => (
              <em className="italic text-slate-600 dark:text-slate-400">{children}</em>
            ),
            a: ({ href, children }) => (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 underline underline-offset-2 hover:text-indigo-800 dark:hover:text-indigo-300">{children}</a>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-indigo-300 dark:border-indigo-600 pl-3 my-3 text-[13px] italic text-slate-600 dark:text-slate-400">{children}</blockquote>
            ),
            code: ({ className, children, ...props }) => {
              const isBlock = className?.startsWith('language-');
              if (isBlock) {
                return (
                  <code className="block bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg px-3 py-2.5 text-[11.5px] font-mono leading-relaxed overflow-x-auto whitespace-pre">{children}</code>
                );
              }
              return (
                <code className="bg-slate-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 rounded px-1 py-0.5 text-[11px] font-mono" {...props}>{children}</code>
              );
            },
            pre: ({ children }) => (
              <pre className="my-3 rounded-lg overflow-hidden">{children}</pre>
            ),
            table: ({ children }) => (
              <div className="my-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full text-[12px] border-collapse">{children}</table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-slate-100 dark:bg-slate-800">{children}</thead>
            ),
            th: ({ children }) => (
              <th className="px-3 py-2 text-left font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">{children}</th>
            ),
            td: ({ children }) => (
              <td className="px-3 py-2 text-slate-600 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800">{children}</td>
            ),
            hr: () => (
              <hr className="my-4 border-slate-200 dark:border-slate-700" />
            ),
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4">
        <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={markdownComponents}>
          {link.aiSummary}
        </ReactMarkdown>
      </div>
      <div className="flex-shrink-0 border-t border-slate-100 dark:border-slate-700/50 px-4 py-2 flex items-center gap-3">
        {/* Generation metadata */}
        <div className="flex-1 flex items-center gap-2.5 min-w-0 overflow-hidden">
          {link.aiSummaryModel && (
            <span
              className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate max-w-[160px]"
              title={link.aiSummaryModel}
            >
              {link.aiSummaryModel}
            </span>
          )}
          {(link.aiSummaryInputTokens != null || link.aiSummaryOutputTokens != null) && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0" title="Input / output tokens">
              {link.aiSummaryInputTokens ?? '?'}↑ {link.aiSummaryOutputTokens ?? '?'}↓ tok
            </span>
          )}
          {link.aiSummaryElapsedMs != null && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0" title="Generation time">
              {link.aiSummaryElapsedMs >= 1000
                ? `${(link.aiSummaryElapsedMs / 1000).toFixed(1)}s`
                : `${link.aiSummaryElapsedMs}ms`}
            </span>
          )}
        </div>
        <button
          onClick={handleDownload}
          className="flex-shrink-0 text-[11px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium flex items-center gap-1 transition-colors"
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
