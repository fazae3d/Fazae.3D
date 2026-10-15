"use client";

import { useEffect, useState } from "react";
import { AdminIcon } from "./admin-icons";

type AdminTheme = "light" | "dark";

const STORAGE_KEY = "admin-theme";

function applyTheme(theme: AdminTheme) {
  document.getElementById("admin-shell")?.setAttribute("data-admin-theme", theme);
}

/** Lê/grava o localStorage direto — o script inline do admin/layout.tsx define o atributo inicial antes da pintura (padrão: escuro). */
export function AdminThemeToggle() {
  const [theme, setTheme] = useState<AdminTheme | null>(null);

  useEffect(() => {
    const current = (document.getElementById("admin-shell")?.getAttribute("data-admin-theme") as AdminTheme | null) ?? "dark";
    setTheme(current);
  }, []);

  const toggle = () => {
    const next: AdminTheme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Navegação privada / armazenamento bloqueado: o tema só não persiste entre visitas.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "light" ? "Mudar para modo escuro" : "Mudar para modo claro"}
      title={theme === "light" ? "Modo escuro" : "Modo claro"}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-mist text-graphite transition-colors hover:border-petrol hover:text-ink"
    >
      <AdminIcon name={theme === "light" ? "moon" : "sun"} className="h-4 w-4" />
    </button>
  );
}
