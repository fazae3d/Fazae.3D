import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { AdminThemeToggle } from "@/components/admin/theme-toggle";
import { SignOutButton } from "@/components/sign-out-button";

/**
 * Runs synchronously as the parser reaches it — before the subtree paints —
 * so the panel never flashes light before switching to a saved dark
 * preference. Targets #admin-shell by id (not document.currentScript —
 * Next.js can relocate inline <script> tags out of their JSX position,
 * which left this pointed at <html> instead of the intended wrapper) and
 * scoped to that element (not html/body) so the override never leaks into
 * the storefront, which shares the same document via the App Router root
 * layout and stays dark-first/brand-only regardless of this.
 */
const INIT_THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('admin-theme')||'dark';document.getElementById('admin-shell').setAttribute('data-admin-theme',t);}catch(e){}})();`;

export const metadata: Metadata = {
  title: "Painel administrativo",
  // Middleware already blocks non-admin sessions; this just keeps the
  // panel itself out of search results.
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  return (
    <div id="admin-shell" className="flex min-h-full bg-paper text-ink">
      <script dangerouslySetInnerHTML={{ __html: INIT_THEME_SCRIPT }} />
      <aside className="hidden w-56 shrink-0 border-r border-mist px-4 py-6 lg:block">
        <div className="flex items-center gap-2 px-3">
          <Link href="/admin" className="font-display text-lg tracking-tight">
            Fazaê <span className="text-petrol">admin</span>
          </Link>
          <AdminThemeToggle />
        </div>
        <div className="mt-8">
          <AdminNav />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-mist px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <AdminMobileNav />
            <div>
              <p className="label-caps text-xs text-graphite">Painel administrativo</p>
              <p className="text-sm">{session?.user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="label-caps text-xs text-graphite transition-colors hover:text-petrol">
              Ver loja
            </Link>
            <SignOutButton />
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
