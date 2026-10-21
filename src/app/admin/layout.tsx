import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/server/db";
import { AdminIcon } from "@/components/admin/admin-icons";
import { AdminLogo } from "@/components/admin/admin-logo";
import { AdminNav, SectionTabs } from "@/components/admin/admin-nav";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { AdminSearch } from "@/components/admin/admin-search";
import { AdminThemeToggle } from "@/components/admin/theme-toggle";
import { TableEnhancer, TitleBadge } from "@/components/admin/enhancers";
import { ToastProvider } from "@/components/admin/toast";
import { SignOutButton } from "@/components/sign-out-button";

export const metadata: Metadata = {
  title: { default: "Gestão", template: "%s · Gestão Fazaê" },
  // Middleware already blocks non-admin sessions; this just keeps the
  // panel itself out of search results.
  robots: { index: false, follow: false },
};

/** Contadores do menu: o que está esperando ação (pedidos pagos sem envio, orçamentos aguardando resposta). */
async function loadNavBadges(): Promise<Record<string, number>> {
  try {
    const [toShip, quotesSent, unreadChats] = await Promise.all([
      db.order.count({ where: { status: { in: ["Pagamento aprovado", "Em preparação"] }, tracking: null } }),
      db.quote.count({ where: { status: "enviado" } }),
      db.waConversation.count({ where: { unreadCount: { gt: 0 } } }),
    ]);
    return { pedidos: toShip, orcamentos: quotesSent, conversas: unreadChats };
  } catch {
    return {};
  }
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  // O papel do JWT só é lido no login; aqui conferimos no banco, para quem perdeu o acesso de admin sair de imediato.
  const email = session?.user?.email;
  if (email) {
    try {
      const row = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { role: true } });
      if (!row || row.role !== "admin") redirect("/");
    } catch (error) {
      // redirect() lança um sinal interno do Next: só engolimos erro de banco, nunca o redirecionamento.
      if (error instanceof Error && (error as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw error;
      console.error("[admin] não foi possível reconferir o papel no banco; mantendo o da sessão", error);
    }
  }

  // O tema vem de um cookie (gravado pelo botão de sol/lua): a página já sai do servidor no tema certo, sem piscar e sem script.
  const theme = (await cookies()).get("admin-theme")?.value === "light" ? "light" : "dark";
  const badges = await loadNavBadges();
  const userName = session?.user?.name ?? "Administrador";

  return (
    <div id="admin-shell" data-admin-theme={theme} className="flex min-h-full bg-paper text-ink">
      <aside className="admin-sidebar hidden w-64 shrink-0 flex-col border-r border-mist lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="px-6 pb-4 pt-6">
          <Link href="/admin" aria-label="Fazaê, início do painel" className="block">
            <AdminLogo className="w-[8.5rem]" priority />
          </Link>
          <span className="mt-2 block text-[11px] font-medium tracking-wide text-graphite">Sistema de gestão</span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <AdminNav badges={badges} />
        </div>
        <div className="border-t border-mist p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-petrol text-sm font-bold text-[#111]">
              {userName.trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{userName}</p>
              <SignOutButton className="!text-xs" />
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-mist bg-paper px-4 py-3 sm:px-6">
          <AdminMobileNav badges={badges} user={userName} />
          <Link href="/admin" aria-label="Fazaê, início do painel" className="lg:hidden">
            <AdminLogo className="w-[5.5rem]" />
          </Link>
          <AdminSearch />
          <div className="flex items-center gap-2 sm:ml-auto">
            <Link
              href="/"
              target="_blank"
              className="hidden items-center gap-1.5 rounded-lg border border-mist px-3 py-2 text-sm text-graphite transition-colors hover:border-petrol hover:text-ink sm:flex"
            >
              Ver loja <AdminIcon name="external" className="h-3.5 w-3.5" />
            </Link>
            <AdminThemeToggle />
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <ToastProvider>
            <TitleBadge count={(badges.pedidos ?? 0) + (badges.orcamentos ?? 0)} />
            <TableEnhancer />
            <SectionTabs />
            {children}
          </ToastProvider>
        </main>
      </div>
    </div>
  );
}
