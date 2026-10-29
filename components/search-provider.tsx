"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { SiteSearch } from "@/components/site-search";
import { useT } from "@/components/language-provider";

type SearchContextValue = {
  open: boolean;
  setOpen: (next: boolean) => void;
};

const SearchContext = createContext<SearchContextValue | null>(null);

export function useSearch(): SearchContextValue {
  const value = useContext(SearchContext);
  if (!value) {
    throw new Error("useSearch must be used inside SearchProvider");
  }
  return value;
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState(pathname);
  if (pathname !== path) {
    setPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const dialog = document.getElementById("site-search-dialog");
    if (!(dialog instanceof HTMLDialogElement)) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const value = useMemo(() => ({ open, setOpen }), [open]);

  return (
    <SearchContext.Provider value={value}>
      {children}
      <dialog
        id="site-search-dialog"
        className="search-dialog"
        aria-label={t("search.open")}
        onClose={() => setOpen(false)}
      >
        <div className="p-3 sm:p-4">
          {open ? (
            <SiteSearch variant="dialog" onNavigate={() => setOpen(false)} />
          ) : null}
        </div>
      </dialog>
    </SearchContext.Provider>
  );
}
