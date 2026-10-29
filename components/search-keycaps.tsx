"use client";

import { useEffect, useState } from "react";

type OsHint = "mac" | "other";

/** Null until after mount so the server and the first client paint match. */
export function useOsHint(): OsHint | null {
  const [hint, setHint] = useState<OsHint | null>(null);
  useEffect(() => {
    const id = window.setTimeout(() => {
      const platform = navigator.platform || "";
      const ua = navigator.userAgent || "";
      const mac = /Mac|iPhone|iPad|iPod/.test(platform) || /Mac OS X/.test(ua);
      setHint(mac ? "mac" : "other");
    }, 0);
    return () => window.clearTimeout(id);
  }, []);
  return hint;
}

export function SearchKeycaps({ className }: { className?: string }) {
  const hint = useOsHint();
  if (!hint) return null;
  const keys = hint === "mac" ? ["⌘", "K"] : ["Ctrl", "K"];
  return (
    <span className={className ?? "search-kbd-row"}>
      {keys.map((key) => (
        <kbd key={key} className="search-kbd">
          {key}
        </kbd>
      ))}
    </span>
  );
}
