"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCart } from "@/contexts/cart-context";
import { useWishlist } from "@/contexts/wishlist-context";
import { HeaderSearch } from "./header-search";
import { SITE_NAME } from "@/lib/site-config";
import { CATEGORIES } from "@/lib/categories";

const SECONDARY_LINKS = [
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/sobre", label: "Sobre" },
];

function Logo({ className = "" }: { className?: string }) {
  return <img src="/logo-header.png" alt={SITE_NAME} className={`h-7 w-auto sm:h-8 ${className}`} />;
}

function ProductsDropdown() {
  return (
    <div className="group relative">
      <Link
        href="/loja"
        className="label-caps flex items-center gap-1 text-xs text-paper transition-colors hover:text-petrol"
      >
        Produtos
        <svg
          width="9"
          height="9"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="transition-transform duration-200 group-hover:rotate-180"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </Link>

      <div className="invisible absolute left-1/2 top-full -translate-x-1/2 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="w-56 border border-paper/10 bg-ink p-2 shadow-lg">
          <ul>
            {CATEGORIES.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/loja?categoria=${category.slug}`}
                  className="block px-3 py-2.5 text-sm text-paper transition-colors hover:bg-paper/5 hover:text-petrol"
                >
                  {category.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/loja"
            className="label-caps mt-1 block border-t border-paper/10 px-3 pt-3 pb-1.5 text-[11px] text-petrol hover:underline"
          >
            Ver todos os produtos
          </Link>
        </div>
      </div>
    </div>
  );
}

function MobileProductsAccordion({ open, onToggle, onNavigate }: { open: boolean; onToggle: () => void; onNavigate: () => void }) {
  return (
    <div className="border-b border-paper/10">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="label-caps flex w-full items-center justify-between py-4 text-sm text-paper"
      >
        Produtos
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul className="pb-3">
          {CATEGORIES.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/loja?categoria=${category.slug}`}
                onClick={onNavigate}
                className="block py-2.5 pl-4 text-sm text-graphite transition-colors hover:text-petrol"
              >
                {category.label}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/loja" onClick={onNavigate} className="label-caps block py-2.5 pl-4 text-[11px] text-petrol">
              Ver todos os produtos
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
}

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { itemCount, openCart } = useCart();
  const { slugs } = useWishlist();
  const { data: session } = useSession();
  const drawerRef = useRef<HTMLDivElement>(null);

  // The portal below only exists client-side (document isn't available
  // during SSR) — gating it on a state flip that happens in an effect,
  // rather than reading `typeof document` directly during render, keeps
  // the very first client render identical to the server-rendered HTML.
  // Reading `typeof document` inline would make that first client render
  // already include the portal, which the server never sent — a hydration
  // mismatch (React discards and rebuilds the tree, only a beat slower).
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    // Pinning <body> with position:fixed (the usual cross-browser scroll-lock
    // trick) forces a full-page reflow on a long page like this one, which
    // shows up on real phones as the background visibly repainting top-to-
    // bottom right as the drawer opens. Plain `overflow: hidden` is cheap and
    // doesn't reflow anything; it just doesn't stop iOS Safari's rubber-band
    // scroll from bleeding through on its own, so touchmove is blocked
    // manually for any touch that starts outside the drawer's own scroll area.
    document.documentElement.style.overflow = "hidden";
    const preventBackgroundScroll = (e: TouchEvent) => {
      if (drawerRef.current?.contains(e.target as Node)) return;
      e.preventDefault();
    };
    document.addEventListener("touchmove", preventBackgroundScroll, { passive: false });
    return () => {
      document.documentElement.style.overflow = "";
      document.removeEventListener("touchmove", preventBackgroundScroll);
    };
  }, [mobileOpen]);

  const closeMobile = () => {
    setMobileOpen(false);
    setMobileProductsOpen(false);
  };

  return (
    <>
      <header
        className={`sticky top-0 z-40 w-full border-b transition-all duration-300 ${
          scrolled
            ? "border-paper/10 bg-ink/95 py-2.5 backdrop-blur-sm"
            : "border-transparent bg-ink py-5"
        }`}
      >
        <div className="relative mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2 shrink-0 p-2 text-paper lg:hidden"
            aria-label="Abrir menu"
            onClick={() => setMobileOpen(true)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>

          <div className="flex flex-1 justify-center lg:flex-none lg:justify-start">
            <Link href="/" className="shrink-0">
              <Logo />
            </Link>
          </div>

          <nav className="hidden items-center gap-7 lg:flex">
            <ProductsDropdown />
            {SECONDARY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="label-caps text-xs text-paper transition-colors hover:text-petrol"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-4 sm:gap-2">
            <HeaderSearch />
            <Link
              href={session ? "/conta" : "/login"}
              aria-label={session ? "Minha conta" : "Entrar"}
              className="-m-2 p-2 text-paper transition-colors hover:text-petrol"
            >
              {session ? (
                <span className="flex h-[21px] w-[21px] items-center justify-center rounded-full bg-petrol text-[10px] text-ink">
                  {session.user?.name?.[0]?.toUpperCase() ?? "C"}
                </span>
              ) : (
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.5-6 8-6s8 2 8 6" />
                </svg>
              )}
            </Link>
            <Link
              href="/favoritos"
              aria-label="Favoritos"
              className="relative -m-2 p-2 text-paper transition-colors hover:text-petrol"
            >
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20.2c-.3 0-.6-.1-.8-.3-1.9-1.5-3.7-2.9-5.2-4.4C3.7 13.2 2 11 2 8.5 2 6 4 4 6.5 4c1.6 0 3 .8 3.9 2 .1.2.4.2.5 0 .9-1.2 2.3-2 3.9-2C17.3 4 19.5 6 19.5 8.5c0 2.5-1.7 4.7-3.9 6.9-1.5 1.5-3.3 2.9-5.2 4.4-.2.2-.5.3-.8.3Z" />
              </svg>
              {slugs.length > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-petrol text-[10px] text-ink">
                  {slugs.length}
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={openCart}
              aria-label="Abrir carrinho"
              className="relative -m-2 p-2 text-paper transition-colors hover:text-petrol"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M6 8h12l1.5 12h-15z" />
                <path d="M9 8a3 3 0 0 1 6 0" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-petrol text-[10px] text-ink">
                  {itemCount}
                </span>
              )}
            </button>
            <Link
              href="/personalizado"
              className="label-caps hidden items-center rounded-full bg-petrol px-5 py-2.5 text-[11px] text-ink transition-colors hover:bg-paper sm:inline-flex"
            >
              Fazer orçamento
            </Link>
          </div>
        </div>
      </header>

      {/* Portaled to <body> instead of nested inside <header> — a `position:
          sticky` ancestor that has activated (scrolled) can trap `position:
          fixed` descendants inside its own box on mobile Safari instead of
          letting them cover the viewport, which is exactly what made this
          drawer render as a squished strip instead of a full-screen panel
          once the page was scrolled. */}
      {mounted &&
        createPortal(
          <>
            <div
              className={`fixed inset-0 z-50 bg-ink/70 transition-opacity duration-300 lg:hidden ${
                mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              onClick={closeMobile}
              aria-hidden="true"
            />
            <div
              ref={drawerRef}
              className={`fixed inset-y-0 left-0 z-50 flex h-full w-full max-w-xs flex-col overflow-y-auto bg-ink shadow-xl transition-transform duration-300 lg:hidden ${
                mobileOpen ? "translate-x-0" : "-translate-x-full"
              }`}
              aria-label="Menu"
            >
              <div className="flex items-center justify-between border-b border-paper/10 px-4 py-5">
                <Logo />
                <button
                  type="button"
                  aria-label="Fechar menu"
                  onClick={closeMobile}
                  className="-m-2 p-2 text-2xl leading-none text-paper"
                >
                  ×
                </button>
              </div>
              <nav className="flex flex-col px-4 py-4">
                <MobileProductsAccordion
                  open={mobileProductsOpen}
                  onToggle={() => setMobileProductsOpen((v) => !v)}
                  onNavigate={closeMobile}
                />
                {SECONDARY_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMobile}
                    className="label-caps border-b border-paper/10 py-4 text-sm text-paper"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/personalizado"
                  onClick={closeMobile}
                  className="label-caps mt-6 inline-flex items-center justify-center rounded-full bg-petrol px-5 py-3 text-xs text-ink"
                >
                  Fazer orçamento
                </Link>
              </nav>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
