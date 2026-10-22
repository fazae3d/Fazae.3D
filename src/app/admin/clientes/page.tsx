import Link from "next/link";
import { PageHeader, StatusBadge } from "@/components/admin/page-header";
import { getCustomersWithMetrics, type CustomerWithMetrics } from "@/server/repositories/customer-repository";
import { formatPrice } from "@/lib/format";
import { isInactive } from "@/lib/customer-insights";
import { formatStoreDate } from "@/lib/quote";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackCustomersWithStats } from "@/server/demo-fallback";

export const metadata = { title: "Clientes" };

const fallbackCustomers: CustomerWithMetrics[] = fallbackCustomersWithStats.map((c) => ({
  ...c,
  metrics: { orderCount: c.orderCount, totalSpent: c.totalSpent, averageTicket: c.orderCount ? c.totalSpent / c.orderCount : 0 },
}));

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim().toLowerCase() ?? "";

  const customers = await withReadFallback(() => getCustomersWithMetrics(), fallbackCustomers);
  const now = new Date();

  const rows = customers
    .filter(
      (c) =>
        !query ||
        c.name.toLowerCase().includes(query) ||
        c.phone.toLowerCase().includes(query) ||
        (c.email ?? "").toLowerCase().includes(query),
    )
    .sort((a, b) => b.metrics.totalSpent - a.metrics.totalSpent);

  return (
    <div>
      <PageHeader
        title="Clientes"
        description={`${rows.length} de ${customers.length} cliente(s)`}
        actions={
          <>
            <a href="/admin/exportar/clientes" className="rounded-lg border border-mist px-3.5 py-2 text-sm text-graphite transition-colors hover:border-petrol hover:text-ink">
              Exportar CSV
            </a>
            <Link href="/admin/clientes/novo" className="rounded-lg bg-petrol px-3.5 py-2 text-sm font-semibold transition-opacity hover:opacity-90">
              Novo cliente
            </Link>
          </>
        }
      />

      <form className="mb-6 flex flex-wrap gap-3" action="/admin/clientes">
        <input
          type="text"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Buscar por nome, telefone ou e-mail"
          className="min-w-[240px] flex-1 rounded-lg border border-mist bg-transparent px-3 py-2.5 text-base outline-none focus:border-petrol sm:text-sm"
        />
        <button type="submit" className="rounded-lg border border-mist px-5 py-2.5 text-sm transition-colors hover:border-petrol">
          Buscar
        </button>
        {params.q && (
          <Link href="/admin/clientes" className="flex items-center px-2 text-sm text-graphite hover:text-ink">
            Limpar
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <div className="admin-card rounded-xl border border-mist px-6 py-16 text-center text-graphite">
          Nenhum cliente encontrado para essa busca.
        </div>
      ) : (
        <div className="admin-card overflow-x-auto rounded-xl border border-mist">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-mist text-xs text-graphite">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Contato</th>
                <th className="px-4 py-3 font-medium">Tags</th>
                <th className="px-4 py-3 text-right font-medium">Compras</th>
                <th className="px-4 py-3 text-right font-medium">Total gasto</th>
                <th className="px-4 py-3 font-medium">Última compra</th>
                <th className="px-4 py-3 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {rows.map((customer) => (
                <tr key={customer.id} className="transition-colors hover:bg-mist/40">
                  <td className="px-4 py-3">
                    <Link href={`/admin/clientes/${customer.id}`} className="font-medium hover:text-petrol">
                      {customer.name || "(sem nome)"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-graphite">
                    <p>{customer.phone}</p>
                    <p className="text-xs">{customer.email ?? "sem e-mail"}</p>
                  </td>
                  <td className="px-4 py-3">
                    {customer.tags.length === 0 ? (
                      <span className="text-graphite">Sem etiquetas</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {customer.tags.map((tag) => (
                          <StatusBadge key={tag}>{tag}</StatusBadge>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">{customer.metrics.orderCount}</td>
                  <td className="px-4 py-3 text-right">{formatPrice(customer.metrics.totalSpent)}</td>
                  <td className="px-4 py-3 text-graphite">{customer.metrics.lastOrderAt ? formatStoreDate(customer.metrics.lastOrderAt) : "Sem compras"}</td>
                  <td className="px-4 py-3">
                    {customer.metrics.orderCount === 0 ? (
                      <StatusBadge>Ainda não comprou</StatusBadge>
                    ) : isInactive(customer.metrics, now) ? (
                      <StatusBadge tone="warning">Parado</StatusBadge>
                    ) : (
                      <StatusBadge tone="success">Ativo</StatusBadge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
