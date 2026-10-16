"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminIcon } from "./admin-icons";
import { AdminLogo } from "./admin-logo";
import { AdminNav } from "./admin-nav";

export function AdminMobileNav({ badges }: { badges?: Record<string, number> }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu administrativo"
        className="-m-2 flex items-center p-2 text-ink lg:hidden"
      >
        <AdminIcon name="menu" className="h-5 w-5" />
      </button>

      <div
        className={`fixed inset-0 z-50 bg-black/60 transition-opacity lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div
        className={`admin-sidebar fixed inset-y-0 left-0 z-50 flex h-full w-72 max-w-[85%] flex-col overflow-y-auto border-r border-mist shadow-xl transition-transform duration-300 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Menu administrativo"
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/admin" onClick={() => setOpen(false)} aria-label="Fazaê, início do painel" className="block">
            <AdminLogo className="w-[7.5rem]" />
          </Link>
          <button type="button" aria-label="Fechar menu" onClick={() => setOpen(false)} className="-m-2 p-2 text-graphite hover:text-ink">
            <AdminIcon name="close" className="h-5 w-5" />
          </button>
        </div>
        <div className="px-3 pb-6">
          <AdminNav badges={badges} onNavigate={() => setOpen(false)} />
        </div>
      </div>
    </>
  );
}
