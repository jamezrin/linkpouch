import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from '../contexts/account';
import OAuthSignInButtons from '../components/OAuthSignInButtons';

export default function AccountPage() {
  const { setAccountToken, isSignedIn } = useAccount();
  const navigate = useNavigate();
  const [oauthError, setOauthError] = useState(false);

  // Extract ?token= from OAuth redirect and store; check for ?error=oauth_failed
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');

    if (token) {
      setAccountToken(token);
    }
    if (error === 'oauth_failed') {
      setOauthError(true);
    }
    if (token || error) {
      window.history.replaceState({}, '', '/account');
    }
  }, [setAccountToken]);

  // Redirect signed-in users away from this page
  useEffect(() => {
    if (isSignedIn) {
      navigate('/stashes', { replace: true });
    }
  }, [isSignedIn, navigate]);

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] flex flex-col items-center justify-center px-4 py-12 gap-5">
      {oauthError && (
        <div className="w-full max-w-sm px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-[13px] text-red-700 dark:text-red-400">
          Sign-in failed. Please try again.
        </div>
      )}
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sign in</h1>
        <p className="text-[14px] text-slate-500 dark:text-slate-400 max-w-xs">
          Link your pouches to an account to recover them across devices. Anonymous signed URLs
          still work — an account is optional.
        </p>
      </div>
      <div className="w-full max-w-sm">
        <OAuthSignInButtons />
      </div>
    </div>
  );
}
