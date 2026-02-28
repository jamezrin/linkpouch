import { createContext, useContext } from 'react';

export interface StashSearchContextValue {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  mobilePane: 'list' | 'preview';
  setMobilePane: (pane: 'list' | 'preview') => void;
}

export const StashSearchContext = createContext<StashSearchContextValue>({
  searchQuery: '',
  setSearchQuery: () => {},
  mobilePane: 'list',
  setMobilePane: () => {},
});

export const useStashSearch = () => useContext(StashSearchContext);
