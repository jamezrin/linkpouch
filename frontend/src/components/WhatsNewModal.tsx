import { useEffect, useState } from 'react';
import { changelog } from '../changelog';

interface Props {
  onClose: () => void;
}

export default function WhatsNewModal({ onClose }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Defer one frame so the enter transition fires
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 250);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Panel — bottom sheet on mobile, centered dialog on desktop */}
      <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center md:p-4 pointer-events-none">
        <div
          className={[
            'w-full md:max-w-md pointer-events-auto',
            'bg-white dark:bg-slate-900',
            'rounded-t-2xl md:rounded-xl',
            'shadow-2xl',
            'border border-slate-200/80 dark:border-slate-800',
            'flex flex-col',
            'max-h-[88dvh] md:max-h-[80dvh]',
            'transition-all duration-300 ease-out',
            visible
              ? 'translate-y-0 opacity-100 md:scale-100'
              : 'translate-y-full md:translate-y-0 opacity-0 md:scale-95',
          ].join(' ')}
          onClick={e => e.stopPropagation()}
        >
          {/* Drag handle — mobile only */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0 md:hidden">
            <div className="w-8 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">What's New</h2>
            <button
              onClick={handleClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Entries — scrollable */}
          <div className="overflow-y-auto p-5 flex flex-col gap-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {changelog.map((entry) => (
              <div key={entry.version}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                    v{entry.version}
                  </span>
                  <span className="text-[12px] text-slate-400 dark:text-slate-500">{entry.date}</span>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {entry.items.map((item, i) => (
                    <li key={i} className="flex gap-2 text-[13px] text-slate-700 dark:text-slate-300 leading-relaxed">
                      <span className="text-indigo-400 flex-shrink-0 mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
