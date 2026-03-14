import { useEffect, useState } from 'react';
import OAuthSignInButtons from './OAuthSignInButtons';

interface Props {
  onClose: () => void;
}

export default function SignInModal({ onClose }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
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
      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />
      <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center md:p-4 pointer-events-none">
        <div
          className={[
            'w-full md:max-w-sm pointer-events-auto',
            'bg-white dark:bg-slate-900',
            'rounded-t-2xl md:rounded-xl',
            'shadow-2xl',
            'border border-slate-200/80 dark:border-slate-800',
            'transition-all duration-300 ease-out',
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 md:translate-y-2',
          ].join(' ')}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <div>
              <h2 className="text-[16px] font-bold text-slate-900 dark:text-white">Sign in</h2>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">
                Link your pouches to recover them across devices.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex-shrink-0 self-start"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="px-5 pb-6 pt-3">
            <OAuthSignInButtons />
          </div>
        </div>
      </div>
    </>
  );
}
