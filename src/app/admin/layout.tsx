import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata: Metadata = {
  title: "Painel administrativo",
  // Middleware already blocks non-admin sessions; this just keeps the
  // panel itself out of search results.
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-full bg-paper text-ink">
      <aside className="hidden w-56 shrink-0 border-r border-mist px-4 py-6 lg:block">
        <Link href="/admin" className="font-display block px-3 text-lg tracking-tight">
          Fazaê <span className="text-petrol">admin</span>
        </Link>
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
