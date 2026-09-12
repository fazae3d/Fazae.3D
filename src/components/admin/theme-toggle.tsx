"use client";

import { useEffect, useState } from "react";

type AdminTheme = "light" | "dark";

const STORAGE_KEY = "admin-theme";

function applyTheme(theme: AdminTheme) {
  document.getElementById("admin-shell")?.setAttribute("data-admin-theme", theme);
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className}>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.55 1.55M17.55 17.55l1.55 1.55M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.55-1.55M17.55 6.45l1.55-1.55" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
    </svg>
  );
}

/** Reads/writes localStorage directly (no React state needed before mount) — see the inline script in admin/layout.tsx that sets the initial attribute before paint. */
export function AdminThemeToggle() {
  const [theme, setTheme] = useState<AdminTheme | null>(null);

  useEffect(() => {
    const current =
      (document.getElementById("admin-shell")?.getAttribute("data-admin-theme") as AdminTheme | null) ?? "light";
    setTheme(current);
  }, []);

  const toggle = () => {
    const next: AdminTheme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private browsing / storage disabled — theme just won't persist across reloads.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-mist text-graphite transition-colors hover:border-petrol hover:text-petrol"
    >
      {theme === "dark" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
    </button>
  );
}
