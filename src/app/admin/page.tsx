import Link from "next/link";
import type { ReactNode } from "react";
import { getAllCategories, getAllProducts } from "@/lib/demo-data";
import { LOW_STOCK_THRESHOLD, isSoldOut } from "@/lib/badges";
import { formatPrice } from "@/lib/format";
import { round2 } from "@/lib/money";
import {
  channelBreakdown,
  paymentBreakdown,
  periodComparison,
  revenueByDay,
  revenueSplit,
  statusBreakdown,
  topProducts,
  isActiveOrder,
  orderBalanceDue,
} from "@/lib/admin-stats";
import { daysUntil, needsFollowUp, quoteDisplayStatus } from "@/lib/quote";
import { monthGoalProgress } from "@/lib/finance-stats";
import { isInactive, wasRecentlyReminded } from "@/lib/customer-insights";
import { getCustomersWithMetrics } from "@/server/repositories/customer-repository";
import { getSettings } from "@/server/repositories/settings-repository";
import { withReadFallback } from "@/lib/db-fallback";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { PageHeader } from "@/components/admin/page-header";
import { getAllOrders } from "@/server/repositories/order-repository";
import { getAllQuotes } from "@/server/repositories/quote-repository";
import { getAllRawMaterials } from "@/server/repositories/raw-material-repository";
import { readWithStatus } from "@/lib/db-fallback";
import { fallbackCategories, fallbackOrders, fallbackProducts, fallbackRawMaterials } from "@/server/demo-fallback";

export const metadata = { title: "Visão geral" };

const REVENUE_WINDOW_DAYS = 14;

function StatTile({
  label,
  value,
  sublabel,
  secondaryValue,
  trend,
}: {
  label: string;
  value: string;
  sublabel?: string;
  /** e.g. "+R$ 120,00 em aberto" — shown in amber under the main value. */
  secondaryValue?: string;
  trend?: { pct: number | null; hasCurrent: boolean };
}) {
  return (
    <div className="admin-card rounded-xl border border-mist p-5">
      <p className="text-xs text-graphite">{label}</p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <p className="font-display text-2xl tracking-tight">{value}</p>
        {trend && trend.pct !== null && (
          <span className={`text-xs font-medium ${trend.pct >= 0 ? "text-petrol" : "text-red-500"}`}>
            {trend.pct >= 0 ? "▲" : "▼"} {Math.abs(trend.pct).toFixed(0)}%
          </span>
        )}
        {trend && trend.pct === null && trend.hasCurrent && <span className="text-xs font-medium text-petrol">Novo</span>}
      </div>
      {secondaryValue && <p className="mt-1.5 text-xs text-amber-500">{secondaryValue}</p>}
      {sublabel && <p className="mt-1 text-xs text-graphite">{sublabel}</p>}
    </div>
  );
}

type AttentionItem = { key: string; count: number; label: string; hint: string; href: string; tone: "warn" | "bad" | "info" };

const ATTENTION_TONE = {
  warn: "bg-amber-500/15 text-amber-500",
  bad: "bg-red-500/15 text-red-400",
  info: "bg-sky-500/15 text-sky-400",
} as const;

function AttentionCard({ item }: { item: AttentionItem }) {
  return (
    <Link
      href={item.href}
      className="admin-card group flex items-center gap-4 rounded-xl border border-mist p-4 transition-colors hover:border-petrol"
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg font-semibold ${ATTENTION_TONE[item.tone]}`}>
        {item.count}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{item.label}</span>
        <span className="block truncate text-xs text-graphite">{item.hint}</span>
      </span>
    </Link>
  );
}

function Panel({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="admin-card rounded-xl border border-mist p-5">
      <p className="mb-4 text-sm font-semibold">{title}</p>
      {children}
      {footer}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const [settings, customersWithMetrics] = await Promise.all([
    withReadFallback(() => getSettings(), null),
    withReadFallback(() => getCustomersWithMetrics(), []),
  ]);
  const [productsResult, categoriesResult, ordersResult, rawMaterialsResult, quotesResult] = await Promise.all([
    readWithStatus(() => getAllProducts(), fallbackProducts),
    readWithStatus(() => getAllCategories(), fallbackCategories),
    readWithStatus(() => getAllOrders(), fallbackOrders),
    readWithStatus(() => getAllRawMaterials(), fallbackRawMaterials),
    readWithStatus(() => getAllQuotes(), []),
  ]);
  const products = productsResult.data;
  const categories = categoriesResult.data;
  const orders = ordersResult.data;
  const rawMaterials = rawMaterialsResult.data;
  const quotes = quotesResult.data;
  const showingFallbackData = [productsResult, categoriesResult, ordersResult, rawMaterialsResult, quotesResult].some(
    (r) => r.usedFallback,
  );

  // Pedidos cancelados ficam de fora do faturamento e do ticket médio (continuam no quadro de status).
  const activeOrders = orders.filter(isActiveOrder);
  const revenue = round2(activeOrders.reduce((sum, o) => sum + o.total, 0));
  const averageTicket = activeOrders.length > 0 ? round2(revenue / activeOrders.length) : 0;
  const { confirmed: confirmedRevenue, pending: pendingRevenue } = revenueSplit(orders);

  const soldOut = products.filter(isSoldOut);
  const lowStock = products.filter((p) => !isSoldOut(p) && p.stock <= LOW_STOCK_THRESHOLD);

  const activeProductionOrders = orders.filter(
    (o) => isActiveOrder(o) && (o.productionStage === "inicio" || o.productionStage === "em_producao"),
  );
  const receivableInProduction = round2(activeProductionOrders.reduce((sum, o) => sum + orderBalanceDue(o), 0));
  const lowStockRawMaterials = rawMaterials.filter((rm) => rm.stock <= (rm.minStock ?? 0));

  const lateOrSoonDeadlines = activeProductionOrders.filter(
    (o) => o.productionDeadline && Math.floor((new Date(o.productionDeadline).getTime() - Date.now()) / 86_400_000) <= 3,
  );
  const lateDeadlines = lateOrSoonDeadlines.filter((o) => new Date(o.productionDeadline!).getTime() < Date.now());

  // "A enviar" = já pago, ainda sem código de rastreio e sem ter saído (mesma regra da tela de Pedidos).
  const toShip = orders.filter((o) => (o.status === "Pagamento aprovado" || o.status === "Em preparação") && !o.tracking);

  const quotesWithStatus = quotes.map((quote) => ({ quote, status: quoteDisplayStatus(quote) }));
  const quotesSent = quotesWithStatus.filter((x) => x.status === "enviado");
  const quotesExpiring = quotesSent.filter((x) => daysUntil(x.quote.validUntil) <= 3);
  const quotesOpen = quotesWithStatus.filter((x) => x.status === "enviado" || x.status === "rascunho");
  const quotesOpenValue = round2(quotesOpen.reduce((sum, x) => sum + x.quote.total, 0));

  const quotesToFollowUp = quotes.filter((q) => needsFollowUp(q));
  const nowDate = new Date();
  const customersToReactivate = customersWithMetrics.filter(
    (c) => c.phone && isInactive(c.metrics, nowDate) && !wasRecentlyReminded(c.lastReminderAt, nowDate),
  );
  const goal = settings?.monthlyGoal ?? 0;
  const goalProgress = goal > 0 ? monthGoalProgress(orders, goal) : null;

  const attention: AttentionItem[] = [
    {
      key: "enviar",
      count: toShip.length,
      label: toShip.length === 1 ? "Pedido para enviar" : "Pedidos para enviar",
      hint: "Já pagos e ainda sem rastreio",
      href: "/admin/pedidos?status=a-enviar",
      tone: "warn" as const,
    },
    {
      key: "atraso",
      count: lateOrSoonDeadlines.length,
      label: "Prazos de produção",
      hint: lateDeadlines.length ? `${lateDeadlines.length} atrasado(s)` : "Vencem em até 3 dias",
      href: "/admin/producao",
      tone: lateDeadlines.length ? ("bad" as const) : ("warn" as const),
    },
    {
      key: "orc",
      count: quotesSent.length,
      label: "Orçamentos aguardando",
      hint: quotesExpiring.length ? `${quotesExpiring.length} vence(m) em até 3 dias` : "Resposta do cliente pendente",
      href: "/admin/orcamentos?status=enviado",
      tone: quotesExpiring.length ? ("warn" as const) : ("info" as const),
    },
    {
      key: "acompanhar",
      count: quotesToFollowUp.length,
      label: "Orçamentos para acompanhar",
      hint: "Sem resposta há 3 dias ou perto de vencer",
      href: "/admin/orcamentos",
      tone: "info" as const,
    },
    {
      key: "reativar",
      count: customersToReactivate.length,
      label: "Clientes para reativar",
      hint: "Compraram antes e não voltam há 120+ dias",
      href: "/admin/clientes/reativar",
      tone: "info" as const,
    },
    {
      key: "estoque",
      count: soldOut.length + lowStock.length,
      label: "Produtos com estoque baixo",
      hint: `${soldOut.length} esgotado(s) · ${lowStock.length} acabando`,
      href: "/admin/estoque",
      tone: soldOut.length ? ("bad" as const) : ("warn" as const),
    },
    {
      key: "insumos",
      count: lowStockRawMaterials.length,
      label: "Insumos acabando",
      hint: `de ${rawMaterials.length} insumo(s) cadastrados`,
      href: "/admin/insumos",
      tone: "warn" as const,
    },
  ].filter((item) => item.count > 0);

  const revenueTrend = periodComparison(orders, 7);
  const chartData = revenueByDay(orders, REVENUE_WINDOW_DAYS);
  const bestSellers = topProducts(orders, 5);
  const payments = paymentBreakdown(orders);
  const channels = channelBreakdown(orders);
  const statuses = statusBreakdown(orders);
  const maxStatusCount = Math.max(1, ...statuses.map((s) => s.count));
  const maxPaymentRevenue = Math.max(1, ...payments.map((p) => p.revenue));
  const maxChannelRevenue = Math.max(1, ...channels.map((c) => c.revenue));

  return (
    <div>
      <PageHeader
        title="Visão geral"
        description={`${products.length} produtos em ${categories.length} categorias · ${orders.length} pedidos no total`}
        actions={
          <>
            <Link href="/admin/vendas/nova" className="rounded-lg border border-mist px-3.5 py-2 text-sm transition-colors hover:border-petrol">
              Lançar venda
            </Link>
            <Link href="/admin/produtos/novo" className="rounded-lg border border-mist px-3.5 py-2 text-sm transition-colors hover:border-petrol">
              Novo produto
            </Link>
            <Link href="/admin/orcamentos/novo" className="rounded-lg bg-petrol px-3.5 py-2 text-sm font-semibold transition-opacity hover:opacity-90">
              Novo orçamento
            </Link>
          </>
        }
      />

      {showingFallbackData && (
        <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-500">
          Não foi possível conectar ao banco de dados agora. Os números abaixo são dados de exemplo, não reais.
        </div>
      )}

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold">Precisa de atenção</h2>
        {attention.length === 0 ? (
          <div className="admin-card rounded-xl border border-mist px-5 py-4 text-sm text-graphite">
            Tudo em dia: nenhum envio parado, prazo apertado ou estoque acabando.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {attention.map((item) => (
              <AttentionCard key={item.key} item={item} />
            ))}
          </div>
        )}
      </section>

      <section className="admin-card mb-6 rounded-xl border border-mist p-5">
        {goalProgress ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Meta do mês</p>
                <p className="text-xs text-graphite">
                  {formatPrice(goalProgress.revenue)} de {formatPrice(goalProgress.goal)} · faltam {goalProgress.daysLeft} dia(s)
                </p>
              </div>
              <p className={`font-display text-2xl ${goalProgress.pct >= 100 ? "text-petrol" : ""}`}>{goalProgress.pct}%</p>
            </div>
            <div className="mt-3 h-2.5 w-full rounded-full bg-mist">
              <div className="h-2.5 rounded-full bg-petrol" style={{ width: `${Math.min(100, goalProgress.pct)}%` }} />
            </div>
            <p className="mt-3 text-xs text-graphite">
              {goalProgress.remaining === 0
                ? "Meta batida! Tudo daqui para frente é lucro extra do mês."
                : `Para fechar a meta: ${formatPrice(goalProgress.remaining)} a vender (${formatPrice(goalProgress.neededPerDay)} por dia). No ritmo atual o mês fecha em ${formatPrice(goalProgress.projected)}${goalProgress.projected >= goalProgress.goal ? ", acima da meta." : "."}`}
            </p>
          </>
        ) : (
          <p className="text-sm text-graphite">
            Defina uma meta de faturamento mensal para acompanhar o progresso aqui.{" "}
            <Link href="/admin/configuracoes" className="text-petrol hover:underline">
              Definir meta
            </Link>
          </p>
        )}
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="Faturamento confirmado"
          value={formatPrice(confirmedRevenue)}
          secondaryValue={pendingRevenue > 0 ? `+${formatPrice(pendingRevenue)} em aberto` : undefined}
          sublabel="Últimos 7 dias comparados aos 7 anteriores"
          trend={{ pct: revenueTrend.pct, hasCurrent: revenueTrend.current > 0 }}
        />
        <StatTile label="Ticket médio" value={formatPrice(averageTicket)} sublabel={`${activeOrders.length} pedido(s) ativos`} />
        <StatTile
          label="A receber (produção)"
          value={formatPrice(receivableInProduction)}
          sublabel={`${activeProductionOrders.length} pedido(s) em produção`}
        />
        <StatTile
          label="Orçamentos em aberto"
          value={formatPrice(quotesOpenValue)}
          sublabel={`${quotesOpen.length} orçamento(s) · ${quotesSent.length} aguardando resposta`}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart data={chartData} />
        </div>

        <Panel title="Pedidos por status">
          {statuses.length === 0 ? (
            <p className="text-xs text-graphite">Nenhum pedido registrado ainda.</p>
          ) : (
            <ul className="space-y-3">
              {statuses.map((s) => (
                <li key={s.status}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{s.status}</span>
                    <span className="text-graphite">{s.count}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-mist">
                    <div className="h-1.5 rounded-full bg-petrol" style={{ width: `${(s.count / maxStatusCount) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="Mais vendidos">
          {bestSellers.length === 0 ? (
            <p className="text-xs text-graphite">Nenhuma venda registrada ainda.</p>
          ) : (
            <ul className="divide-y divide-mist">
              {bestSellers.map((p, i) => (
                <li key={p.slug} className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-4 text-xs text-graphite">{i + 1}</span>
                    <div className="min-w-0">
                      <Link href={`/admin/produtos/${p.slug}`} className="block truncate hover:text-petrol">
                        {p.name}
                      </Link>
                      <p className="text-xs text-graphite">
                        {p.categoryName} · {p.quantity} un.
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-medium">{formatPrice(p.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Formas de pagamento">
          {orders.length === 0 ? (
            <p className="text-xs text-graphite">Nenhum pedido registrado ainda.</p>
          ) : (
            <ul className="space-y-3">
              {payments.map((p) => (
                <li key={p.method}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{p.label}</span>
                    <span className="text-xs text-graphite">
                      {p.count} pedido(s) · {formatPrice(p.revenue)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-mist">
                    <div className="h-1.5 rounded-full bg-sand" style={{ width: `${(p.revenue / maxPaymentRevenue) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Vendas por canal"
          footer={
            <Link href="/admin/vendas/nova" className="mt-4 inline-block text-sm text-petrol hover:underline">
              Lançar venda manual →
            </Link>
          }
        >
          {orders.length === 0 ? (
            <p className="text-xs text-graphite">Nenhum pedido registrado ainda.</p>
          ) : (
            <ul className="space-y-3">
              {channels.map((c) => (
                <li key={c.channel}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{c.label}</span>
                    <span className="text-xs text-graphite">
                      {c.count} pedido(s) · {formatPrice(c.revenue)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-mist">
                    <div className="h-1.5 rounded-full bg-petrol" style={{ width: `${(c.revenue / maxChannelRevenue) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
