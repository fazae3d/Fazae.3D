"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_GROUPS } from "./admin-nav";

function isLinkActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function AdminMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>(() =>
    NAV_GROUPS.filter((g) => g.links.some((l) => isLinkActive(pathname, l.href))).map((g) => g.label),
  );

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => (prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu administrativo"
        className="-m-2 flex items-center p-2 text-ink lg:hidden"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      <div
        className={`fixed inset-0 z-50 bg-ink/40 transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
      <div
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-full max-w-xs flex-col overflow-y-auto bg-paper shadow-xl transition-transform duration-300 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Menu administrativo"
      >
        <div className="flex items-center justify-between border-b border-mist px-4 py-5">
          <Link
            href="/admin"
            onClick={() => setOpen(false)}
            className="font-display block px-3 text-lg tracking-tight"
          >
            Fazaê <span className="text-petrol">admin</span>
          </Link>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setOpen(false)}
            className="-m-2 p-2 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {NAV_GROUPS.map((group) => {
            if (group.links.length === 0) {
              const active = isLinkActive(pathname, group.href!);
              return (
                <Link
                  key={group.label}
                  href={group.href!}
                  onClick={() => setOpen(false)}
                  className={`label-caps px-3 py-2.5 text-xs transition-colors ${
                    active ? "bg-ink text-paper" : "text-graphite hover:bg-mist/60 hover:text-ink"
                  }`}
                >
                  {group.label}
                </Link>
              );
            }

            const groupOpen = openGroups.includes(group.label);
            const groupActive = group.links.some((l) => isLinkActive(pathname, l.href));

            return (
              <div key={group.label}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.label)}
                  className={`label-caps flex w-full items-center justify-between px-3 py-2.5 text-xs transition-colors ${
                    groupActive && !groupOpen ? "text-ink" : "text-graphite hover:text-ink"
                  }`}
                >
                  {group.label}
                  <ChevronIcon open={groupOpen} />
                </button>
                {groupOpen && (
                  <div className="ml-3 flex flex-col gap-1 border-l border-mist pl-3">
                    {group.links.map((link) => {
                      const active = isLinkActive(pathname, link.href);
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setOpen(false)}
                          className={`label-caps px-3 py-2 text-xs transition-colors ${
                            active ? "bg-ink text-paper" : "text-graphite hover:bg-mist/60 hover:text-ink"
                          }`}
                        >
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </>
  );
}
