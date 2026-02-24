import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { linkApi } from '../services/api';

const DEMO_URLS = [
  'https://github.com',
  'https://news.ycombinator.com',
  'https://developer.mozilla.org',
  'https://react.dev',
  'https://tailwindcss.com',
  'https://linear.app',
  'https://www.figma.com',
  'https://vercel.com',
  'https://supabase.com',
  'https://www.typescriptlang.org',
  'https://vitejs.dev',
  'https://bun.sh',
  'https://deno.com',
  'https://www.prisma.io',
  'https://tanstack.com',
  'https://nextjs.org',
  'https://fly.io',
  'https://pnpm.io',
  'https://stripe.com',
  'https://zod.dev',
];

interface DemoButtonProps {
  stashId: string;
  signature: string;
}

export default function DemoButton({ stashId, signature }: DemoButtonProps) {
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<number | null>(null);

  const handleClick = async () => {
    setProgress(0);
    for (const url of DEMO_URLS) {
      try {
        await linkApi.addLink(stashId, signature, { url });
      } catch {
        // skip individual failures silently
      }
      setProgress((p) => (p ?? 0) + 1);
    }
    await queryClient.invalidateQueries({ queryKey: ['links', stashId] });
    setProgress(null);
  };

  const isLoading = progress !== null;

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      title={
        isLoading
          ? `Adding demo links… ${progress}/${DEMO_URLS.length}`
          : 'Add 20 demo links'
      }
      className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/25 hover:border-violet-500/40 text-violet-300 hover:text-violet-200 rounded-lg text-xs font-medium transition-colors disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <>
          <div className="w-3 h-3 border-[1.5px] border-violet-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <span>
            {progress}/{DEMO_URLS.length}
          </span>
        </>
      ) : (
        <>
          {/* Heroicons sparkles */}
          <svg
            className="w-3.5 h-3.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
            />
          </svg>
          <span>Demo</span>
        </>
      )}
    </button>
  );
}
