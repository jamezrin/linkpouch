import { createContext, useContext } from 'react';

export interface StashSearchContextValue {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  mobilePane: 'list' | 'preview';
  setMobilePane: (pane: 'list' | 'preview') => void;
  stashSettingsOpen: boolean;
  setStashSettingsOpen: (open: boolean) => void;
  canWrite: boolean;
  setCanWrite: (v: boolean) => void;
  isClaimerToken: boolean;
  setIsClaimerToken: (v: boolean) => void;
}

export const StashSearchContext = createContext<StashSearchContextValue>({
  searchQuery: '',
  setSearchQuery: () => {},
  mobilePane: 'list',
  setMobilePane: () => {},
  stashSettingsOpen: false,
  setStashSettingsOpen: () => {},
  canWrite: true,
  setCanWrite: () => {},
  isClaimerToken: false,
  setIsClaimerToken: () => {},
});

export const useStashSearch = () => useContext(StashSearchContext);
