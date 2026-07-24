// SPDX-License-Identifier: MIT

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import GlobalSearchDialog from "./GlobalSearchDialog";

interface GlobalSearchContextValue {
  openSearch: () => void;
  closeSearch: () => void;
  searchOpen: boolean;
}

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(
  null,
);

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const modifier = event.metaKey || event.ctrlKey;

      if (modifier && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((current) => !current);
        return;
      }

      if (event.key === "Escape" && searchOpen) {
        setSearchOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen]);

  const value = useMemo(
    () => ({ openSearch, closeSearch, searchOpen }),
    [openSearch, closeSearch, searchOpen],
  );

  return (
    <GlobalSearchContext.Provider value={value}>
      {children}
      <GlobalSearchDialog open={searchOpen} onClose={closeSearch} />
    </GlobalSearchContext.Provider>
  );
}

export function useGlobalSearchDialog() {
  const context = useContext(GlobalSearchContext);
  if (!context) {
    throw new Error(
      "useGlobalSearchDialog must be used inside GlobalSearchProvider.",
    );
  }
  return context;
}
