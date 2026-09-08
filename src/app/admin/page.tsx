import Link from "next/link";
import { getAllCategories, getAllProducts } from "@/lib/demo-data";
import { LOW_STOCK_THRESHOLD, isSoldOut } from "@/lib/badges";
import { formatPrice } from "@/lib/format";
import { round2 } from "@/lib/money";
import {
  paymentBreakdown,
  periodComparison,
  revenueByDay,
  statusBreakdown,
  topProducts,
} from "@/lib/admin-stats";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { getAllOrders } from "@/server/repositories/order-repository";
import { getAllRawMaterials } from "@/server/repositories/raw-material-repository";
import { withReadFallback } from "@/lib/db-fallback";
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

function StatTile({
  label,
  value,
  sublabel,
  trend,
}: {
  label: string;
  value: string;
  sublabel?: string;
  trend?: { pct: number | null; hasCurrent: boolean };
}) {
  return (
    <div className="border border-mist p-5">
      <p className="label-caps text-[11px] text-graphite">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
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
      {sublabel && <p className="mt-1 text-xs text-graphite">{sublabel}</p>}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const [products, categories, orders, rawMaterials] = await Promise.all([
    withReadFallback(() => getAllProducts(), fallbackProducts),
    withReadFallback(() => getAllCategories(), fallbackCategories),
    withReadFallback(() => getAllOrders(), fallbackOrders),
    withReadFallback(() => getAllRawMaterials(), fallbackRawMaterials),
  ]);

  const revenue = round2(orders.reduce((sum, o) => sum + o.total, 0));
  const averageTicket = orders.length > 0 ? round2(revenue / orders.length) : 0;

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
  const statuses = statusBreakdown(orders);
  const maxStatusCount = Math.max(1, ...statuses.map((s) => s.count));
  const maxPaymentRevenue = Math.max(1, ...payments.map((p) => p.revenue));

  return (
    <div>
      <h1 className="font-display mb-8 text-2xl sm:text-3xl">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile
          label="Faturamento"
          value={formatPrice(revenue)}
          sublabel={`${orders.length} pedido(s)`}
          trend={{ pct: revenueTrend.pct, hasCurrent: revenueTrend.current > 0 }}
        />
        <StatTile label="Ticket médio" value={formatPrice(averageTicket)} />
        <StatTile label="Produtos" value={String(products.length)} sublabel={`${categories.length} categoria(s)`} />
        <StatTile label="Estoque baixo" value={String(lowStock.length)} sublabel={`≤ ${LOW_STOCK_THRESHOLD} peças`} />
        <StatTile label="Esgotados" value={String(soldOut.length)} />
        <StatTile
          label="A receber (produção)"
          value={formatPrice(receivableInProduction)}
          sublabel={`${activeProductionOrders.length} pedido(s) em produção`}
        />
        <StatTile
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

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
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
