import { createContext, useContext } from 'react';

export interface StashSearchContextValue {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  mobilePane: 'list' | 'preview';
  setMobilePane: (pane: 'list' | 'preview') => void;
  stashSettingsOpen: boolean;
  setStashSettingsOpen: (open: boolean) => void;
}

export const StashSearchContext = createContext<StashSearchContextValue>({
  searchQuery: '',
  setSearchQuery: () => {},
  mobilePane: 'list',
  setMobilePane: () => {},
  stashSettingsOpen: false,
  setStashSettingsOpen: () => {},
});

export const useStashSearch = () => useContext(StashSearchContext);
