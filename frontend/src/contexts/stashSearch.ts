import { createContext, useContext } from 'react';

export interface StashSearchContextValue {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const StashSearchContext = createContext<StashSearchContextValue>({
  searchQuery: '',
  setSearchQuery: () => {},
});

export const useStashSearch = () => useContext(StashSearchContext);
