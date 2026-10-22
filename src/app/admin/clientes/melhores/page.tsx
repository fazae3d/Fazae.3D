import Link from "next/link";
import { PageHeader, StatusBadge } from "@/components/admin/page-header";
import { withReadFallback } from "@/lib/db-fallback";
import { formatPrice } from "@/lib/format";
import { isInactive, rankCustomers } from "@/lib/customer-insights";
import { round2 } from "@/lib/money";
import { formatStoreDate } from "@/lib/quote";
import { getCustomersWithMetrics } from "@/server/repositories/customer-repository";

export const metadata = { title: "Melhores clientes" };

const LIMIT = 20;

export default async function BestCustomersPage({ searchParams }: { searchParams: Promise<{ ordem?: string }> }) {
  const { ordem } = await searchParams;
  const by = ordem === "quantidade" ? "quantidade" : "valor";

  const customers = await withReadFallback(() => getCustomersWithMetrics(), []);
  const buyers = rankCustomers(customers, new Map(customers.map((c) => [c.id, c.metrics])), by);
  const top = buyers.slice(0, LIMIT);

  const totalRevenue = round2(buyers.reduce((sum, c) => sum + c.metrics.totalSpent, 0));
  const topTenRevenue = round2(buyers.slice(0, 10).reduce((sum, c) => sum + c.metrics.totalSpent, 0));
  const repeatBuyers = buyers.filter((c) => c.metrics.orderCount >= 2).length;
  const now = new Date();

  return (
    <div>
      <PageHeader
        title="Melhores clientes"
        description="Quem mais compra com você, por valor gasto ou por número de compras. Pedidos cancelados e pagamentos pendentes do site não contam."
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Clientes que já compraram", value: String(buyers.length), sub: `de ${customers.length} cadastrados` },
          { label: "Compraram mais de uma vez", value: String(repeatBuyers), sub: buyers.length ? `${Math.round((repeatBuyers / buyers.length) * 100)}% voltaram` : "sem compradores" },
          { label: "Total vendido a eles", value: formatPrice(totalRevenue), sub: "soma de todas as compras" },
          {
            label: "10 melhores clientes",
            value: totalRevenue > 0 ? `${Math.round((topTenRevenue / totalRevenue) * 100)}%` : "0%",
            sub: `${formatPrice(topTenRevenue)} do total`,
          },
        ].map((kpi) => (
          <div key={kpi.label} className="admin-card rounded-xl border border-mist p-4">
            <p className="text-xs text-graphite">{kpi.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{kpi.value}</p>
            <p className="mt-0.5 text-xs text-graphite">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm text-graphite">Ordenar por</span>
        {(
          [
            ["valor", "Valor gasto"],
            ["quantidade", "Número de compras"],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/clientes/melhores?ordem=${key}`}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              by === key ? "admin-chip-active" : "border-mist text-graphite hover:border-petrol hover:text-ink"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {top.length === 0 ? (
        <div className="admin-card rounded-xl border border-mist px-6 py-16 text-center text-graphite">
          Ainda não há clientes com compras para classificar.
        </div>
      ) : (
        <div className="admin-card overflow-x-auto rounded-xl border border-mist">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-mist text-xs text-graphite">
                <th className="w-12 px-4 py-3 font-medium">#</th>
                <th className="px-3 py-3 font-medium">Cliente</th>
                <th className="px-3 py-3 text-right font-medium">Compras</th>
                <th className="px-3 py-3 text-right font-medium">Valor gasto</th>
                <th className="px-3 py-3 text-right font-medium">Ticket médio</th>
                <th className="px-3 py-3 font-medium">Última compra</th>
                <th className="px-4 py-3 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {top.map((customer, index) => {
                const inactive = isInactive(customer.metrics, now);
                return (
                  <tr key={customer.id} className="transition-colors hover:bg-mist/40">
                    <td className="px-4 py-3 text-graphite">{index + 1}</td>
                    <td className="px-3 py-3">
                      <Link href={`/admin/clientes/${customer.id}`} className="font-medium hover:text-petrol">
                        {customer.name || "(sem nome)"}
                      </Link>
                      <p className="text-xs text-graphite">{customer.phone}</p>
                    </td>
                    <td className={`px-3 py-3 text-right ${by === "quantidade" ? "font-semibold" : ""}`}>{customer.metrics.orderCount}</td>
                    <td className={`px-3 py-3 text-right ${by === "valor" ? "font-semibold" : ""}`}>{formatPrice(customer.metrics.totalSpent)}</td>
                    <td className="px-3 py-3 text-right text-graphite">{formatPrice(customer.metrics.averageTicket)}</td>
                    <td className="px-3 py-3 text-graphite">{customer.metrics.lastOrderAt ? formatStoreDate(customer.metrics.lastOrderAt) : "Sem compras"}</td>
                    <td className="px-4 py-3">
                      {inactive ? <StatusBadge tone="warning">Parado</StatusBadge> : <StatusBadge tone="success">Ativo</StatusBadge>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {buyers.length > LIMIT && <p className="mt-3 text-xs text-graphite">Mostrando os {LIMIT} primeiros de {buyers.length}.</p>}
    </div>
  );
}
