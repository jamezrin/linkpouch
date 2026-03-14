import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from '../contexts/account';

// This page exists solely to receive the OAuth callback (?token= or ?error=).
// It stores the token and immediately redirects to home.
export default function AccountPage() {
  const { setAccountToken } = useAccount();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      setAccountToken(token);
    }

    navigate('/', { replace: true });
  }, [setAccountToken, navigate]);

  return null;
}
