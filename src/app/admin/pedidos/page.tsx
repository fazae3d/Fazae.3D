import Link from "next/link";
import { getAllOrders } from "@/server/repositories/order-repository";
import { OrderStatusForm } from "@/components/admin/order-status-form";
import { formatPrice } from "@/lib/format";
import type { Order, OrderStatus } from "@/server/types";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackOrders } from "@/server/demo-fallback";

const ALL_STATUSES: OrderStatus[] = [
  "Pedido recebido",
  "Pagamento aprovado",
  "Em preparação",
  "Enviado",
  "Em trânsito",
  "Entregue",
  "Cancelado",
];

const PAGE_SIZE = 10;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

const CHANNEL_LABELS: Record<Order["channel"], string> = {
  online: "Online",
  presencial: "Presencial",
  whatsapp: "WhatsApp",
};

function matchesQuery(order: Order, query: string) {
  const term = query.toLowerCase();
  return (
    order.id.toLowerCase().includes(term) ||
    Boolean(order.userEmail?.toLowerCase().includes(term)) ||
    Boolean(order.customerName?.toLowerCase().includes(term))
  );
}

function buildQueryString(params: Record<string, string>) {
  const search = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/pedidos">) {
  const params = await searchParams;
  const statusFilter = typeof params.status === "string" ? params.status : "";
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const from = typeof params.from === "string" ? params.from : "";
  const to = typeof params.to === "string" ? params.to : "";
  const page = Math.max(1, Number(typeof params.page === "string" ? params.page : "1") || 1);

  const orders = await withReadFallback(() => getAllOrders(), fallbackOrders);
  const filtered = orders
    .filter((o) => !statusFilter || o.status === statusFilter)
    .filter((o) => !query || matchesQuery(o, query))
    .filter((o) => !from || o.createdAt.slice(0, 10) >= from)
    .filter((o) => !to || o.createdAt.slice(0, 10) <= to);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const baseParams = { status: statusFilter, q: query, from, to };
  const hasFilters = statusFilter || query || from || to;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">Pedidos</h1>
          <p className="mt-1 text-sm text-graphite">
            {filtered.length} de {orders.length} pedido(s)
          </p>
        </div>
        <Link
          href="/admin/vendas/nova"
          className="label-caps border border-ink px-5 py-3 text-xs transition-colors hover:bg-ink hover:text-paper"
        >
          Lançar venda
        </Link>
      </div>

      <form className="mb-6 flex flex-wrap items-end gap-3" action="/admin/pedidos">
        <div className="flex-1 min-w-[220px]">
          <label className="label-caps mb-1 block text-[10px] text-graphite">Buscar</label>
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Nº do pedido ou e-mail"
            className="w-full border border-mist px-3 py-2.5 text-base outline-none focus:border-petrol sm:text-sm"
          />
        </div>
        <div>
          <label className="label-caps mb-1 block text-[10px] text-graphite">De</label>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="border border-mist px-3 py-2.5 text-base outline-none focus:border-petrol sm:text-sm"
          />
        </div>
        <div>
          <label className="label-caps mb-1 block text-[10px] text-graphite">Até</label>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="border border-mist px-3 py-2.5 text-base outline-none focus:border-petrol sm:text-sm"
          />
        </div>
        <input type="hidden" name="status" value={statusFilter} />
        <button
          type="submit"
          className="label-caps border border-ink px-5 py-2.5 text-xs transition-colors hover:bg-ink hover:text-paper"
        >
          Aplicar
        </button>
        {hasFilters && (
          <Link
            href="/admin/pedidos"
            className="label-caps flex items-center px-2 text-[11px] text-graphite hover:text-petrol"
          >
            Limpar
          </Link>
        )}
      </form>

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href={`/admin/pedidos${buildQueryString({ ...baseParams, status: "" })}`}
          className={`label-caps border px-3.5 py-2 text-[11px] transition-colors ${
            !statusFilter ? "border-ink bg-ink text-paper" : "border-mist text-graphite hover:border-ink"
          }`}
        >
          Todos
        </Link>
        {ALL_STATUSES.map((status) => (
          <Link
            key={status}
            href={`/admin/pedidos${buildQueryString({ ...baseParams, status })}`}
            className={`label-caps border px-3.5 py-2 text-[11px] transition-colors ${
              statusFilter === status ? "border-ink bg-ink text-paper" : "border-mist text-graphite hover:border-ink"
            }`}
          >
            {status}
          </Link>
        ))}
      </div>

      {paginated.length === 0 ? (
        <div className="border border-mist px-6 py-16 text-center text-graphite">
          Nenhum pedido encontrado para esse filtro.
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {paginated.map((order) => (
            <li key={order.id} className="border border-mist p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-mist pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-ink">Pedido {order.id}</p>
                    {order.channel !== "online" && (
                      <span className="label-caps border border-mist px-2 py-0.5 text-[10px] text-graphite">
                        {CHANNEL_LABELS[order.channel]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-graphite">
                    {order.userEmail ?? order.customerName ?? "Cliente não identificado"} · {formatDate(order.createdAt)}
                  </p>
                </div>
                <p className="text-sm font-medium">{formatPrice(order.total)}</p>
              </div>

              <ul className="divide-y divide-mist py-3">
                {order.items.map((item) => (
                  <li
                    key={`${item.productSlug}-${item.material}-${item.color}`}
                    className="flex items-center justify-between py-2 text-xs text-graphite"
                  >
                    <span>
                      {item.name} · {item.categoryName} · {item.material} · {item.color} · Qtd {item.quantity}
                    </span>
                    <span>{formatPrice(item.price * item.quantity)}</span>
                  </li>
                ))}
              </ul>

              <div className="border-t border-mist pt-4">
                <OrderStatusForm order={order} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm">
          <Link
            href={`/admin/pedidos${buildQueryString({ ...baseParams, page: String(currentPage - 1) })}`}
            aria-disabled={currentPage <= 1}
            className={`label-caps border border-mist px-4 py-2 text-[11px] transition-colors ${
              currentPage <= 1 ? "pointer-events-none opacity-40" : "hover:border-ink"
            }`}
          >
            Anterior
          </Link>
          <span className="text-xs text-graphite">
            Página {currentPage} de {totalPages}
          </span>
          <Link
            href={`/admin/pedidos${buildQueryString({ ...baseParams, page: String(currentPage + 1) })}`}
            aria-disabled={currentPage >= totalPages}
            className={`label-caps border border-mist px-4 py-2 text-[11px] transition-colors ${
              currentPage >= totalPages ? "pointer-events-none opacity-40" : "hover:border-ink"
            }`}
          >
            Próxima
          </Link>
        </div>
      )}
    </div>
  );
}
