import { createContext, useContext } from 'react';
import { useAccountToken } from '../hooks/useAccountToken';

interface AccountContextValue {
  accountToken: string | null;
  setAccountToken: (token: string | null) => void;
  clearAccountToken: () => void;
  isSignedIn: boolean;
}

export const AccountContext = createContext<AccountContextValue>({
  accountToken: null,
  setAccountToken: () => {},
  clearAccountToken: () => {},
  isSignedIn: false,
});

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { token, setToken, clearToken, isSignedIn } = useAccountToken();

  return (
    <AccountContext.Provider
      value={{
        accountToken: token,
        setAccountToken: setToken,
        clearAccountToken: clearToken,
        isSignedIn,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  return useContext(AccountContext);
}
