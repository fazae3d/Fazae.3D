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
} from "@/lib/admin-stats";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { getAllOrders } from "@/server/repositories/order-repository";
import { getAllRawMaterials } from "@/server/repositories/raw-material-repository";
import { readWithStatus } from "@/lib/db-fallback";
import { fallbackCategories, fallbackOrders, fallbackProducts, fallbackRawMaterials } from "@/server/demo-fallback";

const REVENUE_WINDOW_DAYS = 14;

// Same red/amber convention as production-board.tsx's deadlineClass: overdue
// is red, due within 3 days is amber, everything else stays neutral.
function deadlineTextClass(diffDays: number) {
  if (diffDays < 0) return "text-red-500";
  if (diffDays <= 3) return "text-amber-500";
  return "text-graphite";
}

function formatDeadline(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function DollarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className}>
      <path d="M12 2v20M17 6.5c0-1.93-2.24-3.5-5-3.5S7 4.57 7 6.5 9.24 10 12 10s5 1.57 5 3.5-2.24 3.5-5 3.5-5-1.57-5-3.5" />
    </svg>
  );
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12.6 2.9 3.6 11.9a2 2 0 0 0 0 2.8l5.7 5.7a2 2 0 0 0 2.8 0l9-9a2 2 0 0 0 .59-1.42V4a1 1 0 0 0-1-1h-5.87a2 2 0 0 0-1.42.59Z" />
      <circle cx="16.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BoxIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m3.5 7.5 8.5-4 8.5 4-8.5 4-8.5-4Z" />
      <path d="M3.5 7.5v9l8.5 4 8.5-4v-9M12 11.5v9" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3 2 20h20L12 3Z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6m0-6-6 6" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

function StatTile({
  label,
  value,
  sublabel,
  secondaryValue,
  trend,
  icon,
}: {
  label: string;
  value: string;
  sublabel?: string;
  /** e.g. "+R$ 120,00 em aberto" — shown in amber under the main value. */
  secondaryValue?: string;
  trend?: { pct: number | null; hasCurrent: boolean };
  icon?: ReactNode;
}) {
  return (
    <div className="border border-mist p-5">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-petrol/10 text-petrol">
            {icon}
          </div>
        )}
        <div>
          <p className="label-caps text-[11px] text-graphite">{label}</p>
          <div className="mt-1 flex items-baseline gap-2">
            <p className="font-display text-2xl">{value}</p>
            {trend && trend.pct !== null && (
              <span className={`label-caps text-[10px] ${trend.pct >= 0 ? "text-petrol" : "text-red-600"}`}>
                {trend.pct >= 0 ? "▲" : "▼"} {Math.abs(trend.pct).toFixed(0)}%
              </span>
            )}
            {trend && trend.pct === null && trend.hasCurrent && (
              <span className="label-caps text-[10px] text-petrol">Novo</span>
            )}
          </div>
        </div>
      </div>
      {secondaryValue && <p className="mt-2 text-xs text-amber-500">{secondaryValue}</p>}
      {sublabel && <p className="mt-1 text-xs text-graphite">{sublabel}</p>}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const [productsResult, categoriesResult, ordersResult, rawMaterialsResult] = await Promise.all([
    readWithStatus(() => getAllProducts(), fallbackProducts),
    readWithStatus(() => getAllCategories(), fallbackCategories),
    readWithStatus(() => getAllOrders(), fallbackOrders),
    readWithStatus(() => getAllRawMaterials(), fallbackRawMaterials),
  ]);
  const products = productsResult.data;
  const categories = categoriesResult.data;
  const orders = ordersResult.data;
  const rawMaterials = rawMaterialsResult.data;
  const showingFallbackData = [productsResult, categoriesResult, ordersResult, rawMaterialsResult].some(
    (r) => r.usedFallback,
  );

  const revenue = round2(orders.reduce((sum, o) => sum + o.total, 0));
  const averageTicket = orders.length > 0 ? round2(revenue / orders.length) : 0;
  const { confirmed: confirmedRevenue, pending: pendingRevenue } = revenueSplit(orders);

  const soldOut = products.filter(isSoldOut);
  const lowStock = products.filter((p) => !isSoldOut(p) && p.stock <= LOW_STOCK_THRESHOLD);

  const activeProductionOrders = orders.filter(
    (o) => o.productionStage === "inicio" || o.productionStage === "em_producao",
  );
  const receivableInProduction = round2(
    activeProductionOrders.reduce((sum, o) => sum + (o.total - (o.depositAmount ?? 0)), 0),
  );
  const lowStockRawMaterials = rawMaterials.filter((rm) => rm.stock <= (rm.minStock ?? 0));

  const upcomingDeadlines = activeProductionOrders
    .filter((o) => o.productionDeadline)
    .map((o) => ({
      order: o,
      diffDays: Math.floor((new Date(o.productionDeadline!).getTime() - Date.now()) / 86_400_000),
    }))
    .filter((entry) => entry.diffDays <= 3)
    .sort((a, b) => a.diffDays - b.diffDays)
    .slice(0, 5);

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
      <h1 className="font-display mb-8 text-2xl sm:text-3xl">Dashboard</h1>

      {showingFallbackData && (
        <div className="mb-6 border border-sand/50 bg-sand/10 px-4 py-3 text-xs text-sand">
          Não foi possível conectar ao banco de dados agora — os números abaixo são dados de exemplo, não reais.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile
          icon={<DollarIcon className="h-4.5 w-4.5" />}
          label="Faturamento confirmado"
          value={formatPrice(confirmedRevenue)}
          secondaryValue={pendingRevenue > 0 ? `+${formatPrice(pendingRevenue)} em aberto` : undefined}
          sublabel={`${orders.length} pedido(s)`}
          trend={{ pct: revenueTrend.pct, hasCurrent: revenueTrend.current > 0 }}
        />
        <StatTile icon={<TagIcon className="h-4.5 w-4.5" />} label="Ticket médio" value={formatPrice(averageTicket)} />
        <StatTile
          icon={<BoxIcon className="h-4.5 w-4.5" />}
          label="Produtos"
          value={String(products.length)}
          sublabel={`${categories.length} categoria(s)`}
        />
        <StatTile
          icon={<AlertIcon className="h-4.5 w-4.5" />}
          label="Estoque baixo"
          value={String(lowStock.length)}
          sublabel={`≤ ${LOW_STOCK_THRESHOLD} peças`}
        />
        <StatTile icon={<XCircleIcon className="h-4.5 w-4.5" />} label="Esgotados" value={String(soldOut.length)} />
        <StatTile
          icon={<ClockIcon className="h-4.5 w-4.5" />}
          label="A receber (produção)"
          value={formatPrice(receivableInProduction)}
          sublabel={`${activeProductionOrders.length} pedido(s) em produção`}
        />
        <StatTile
          icon={<AlertIcon className="h-4.5 w-4.5" />}
          label="Insumos com estoque baixo"
          value={String(lowStockRawMaterials.length)}
          sublabel={`de ${rawMaterials.length} insumo(s)`}
        />
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart data={chartData} />
        </div>

        <div className="border border-mist p-5">
          <p className="label-caps mb-4 text-[11px] text-graphite">Pedidos por status</p>
          {statuses.length === 0 ? (
            <p className="text-xs text-graphite">Nenhum pedido registrado ainda.</p>
          ) : (
            <ul className="space-y-2.5">
              {statuses.map((s) => (
                <li key={s.status}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink">{s.status}</span>
                    <span className="text-graphite">{s.count}</span>
                  </div>
                  <div className="mt-1 h-1 w-full bg-mist">
                    <div
                      className="h-1 bg-petrol"
                      style={{ width: `${(s.count / maxStatusCount) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="border border-mist p-5">
          <p className="label-caps mb-4 text-[11px] text-graphite">Mais vendidos</p>
          {bestSellers.length === 0 ? (
            <p className="text-xs text-graphite">Nenhuma venda registrada ainda.</p>
          ) : (
            <ul className="divide-y divide-mist">
              {bestSellers.map((p, i) => (
                <li key={p.slug} className="flex items-center justify-between py-2.5 text-sm first:pt-0">
                  <div className="flex items-center gap-3">
                    <span className="label-caps w-4 text-[11px] text-graphite">{i + 1}</span>
                    <div>
                      <Link href={`/admin/produtos/${p.slug}`} className="hover:text-petrol">
                        {p.name}
                      </Link>
                      <p className="text-xs text-graphite">
                        {p.categoryName} · {p.quantity} un.
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium">{formatPrice(p.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border border-mist p-5">
          <p className="label-caps mb-4 text-[11px] text-graphite">Formas de pagamento</p>
          {orders.length === 0 ? (
            <p className="text-xs text-graphite">Nenhum pedido registrado ainda.</p>
          ) : (
            <ul className="space-y-3">
              {payments.map((p) => (
                <li key={p.method}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink">{p.label}</span>
                    <span className="text-graphite">
                      {p.count} pedido(s) · {formatPrice(p.revenue)}
                    </span>
                  </div>
                  <div className="mt-1 h-1 w-full bg-mist">
                    <div
                      className="h-1 bg-sand"
                      style={{ width: `${(p.revenue / maxPaymentRevenue) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border border-mist p-5">
          <p className="label-caps mb-4 text-[11px] text-graphite">Vendas por canal</p>
          {orders.length === 0 ? (
            <p className="text-xs text-graphite">Nenhum pedido registrado ainda.</p>
          ) : (
            <ul className="space-y-3">
              {channels.map((c) => (
                <li key={c.channel}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink">{c.label}</span>
                    <span className="text-graphite">
                      {c.count} pedido(s) · {formatPrice(c.revenue)}
                    </span>
                  </div>
                  <div className="mt-1 h-1 w-full bg-mist">
                    <div
                      className="h-1 bg-petrol"
                      style={{ width: `${(c.revenue / maxChannelRevenue) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/admin/vendas/nova"
            className="label-caps mt-4 inline-block text-[11px] text-petrol hover:underline"
          >
            Lançar venda manual →
          </Link>
        </div>
      </div>

      {(lowStock.length > 0 || soldOut.length > 0) && (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {lowStock.length > 0 && (
            <div className="border border-mist p-5">
              <p className="label-caps mb-3 text-[11px] text-graphite">Estoque baixo</p>
              <ul className="space-y-2">
                {lowStock.map((p) => (
                  <li key={p.slug} className="flex items-center justify-between text-sm">
                    <Link href={`/admin/produtos/${p.slug}`} className="hover:text-petrol">
                      {p.name}
                    </Link>
                    <span className="text-sand">{p.stock} un.</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {soldOut.length > 0 && (
            <div className="border border-mist p-5">
              <p className="label-caps mb-3 text-[11px] text-graphite">Esgotados</p>
              <ul className="space-y-2">
                {soldOut.map((p) => (
                  <li key={p.slug} className="flex items-center justify-between text-sm">
                    <Link href={`/admin/produtos/${p.slug}`} className="hover:text-petrol">
                      {p.name}
                    </Link>
                    <span className="text-graphite">0 un.</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {upcomingDeadlines.length > 0 && (
        <div className="mt-6 border border-mist p-5">
          <p className="label-caps mb-3 text-[11px] text-graphite">Prazos próximos/atrasados</p>
          <ul className="divide-y divide-mist">
            {upcomingDeadlines.map(({ order, diffDays }) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm first:pt-0">
                <div>
                  <Link href="/admin/producao" className="text-ink hover:text-petrol">
                    {order.customerName ?? order.userEmail ?? "Não identificado"}
                  </Link>
                  <p className="text-xs text-graphite">Pedido {order.id}</p>
                </div>
                <span className={`label-caps text-[11px] ${deadlineTextClass(diffDays)}`}>
                  {formatDeadline(order.productionDeadline!)}
                  {diffDays < 0 ? " · atrasado" : diffDays === 0 ? " · hoje" : ` · ${diffDays}d`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/admin/produtos/novo"
          className="label-caps border border-ink px-5 py-3 text-xs transition-colors hover:bg-ink hover:text-paper"
        >
          Novo produto
        </Link>
        <Link
          href="/admin/categorias/novo"
          className="label-caps border border-ink px-5 py-3 text-xs transition-colors hover:bg-ink hover:text-paper"
        >
          Nova categoria
        </Link>
        <Link
          href="/admin/estoque"
          className="label-caps border border-ink px-5 py-3 text-xs transition-colors hover:bg-ink hover:text-paper"
        >
          Gerenciar estoque
        </Link>
        <Link
          href="/admin/pedidos"
          className="label-caps border border-ink px-5 py-3 text-xs transition-colors hover:bg-ink hover:text-paper"
        >
          Ver pedidos
        </Link>
      </div>
    </div>
  );
}
