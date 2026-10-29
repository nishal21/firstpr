"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { useT } from "@/components/language-provider";

function subscribe() {
  return () => {};
}

export function ThemeToggle({ className }: { className?: string }) {
  const t = useT();
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const dark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      className={className}
      aria-pressed={dark}
      aria-label={t("footer.theme")}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? t("footer.themeDark") : t("footer.themeLight")}
    </button>
  );
}
