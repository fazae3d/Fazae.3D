import { EmptyState } from "@/components/admin/empty-state";
import Link from "next/link";
import { getAllOrders } from "@/server/repositories/order-repository";
import { OrderStatusForm } from "@/components/admin/order-status-form";
import { MarkAllPaidButton } from "@/components/admin/mark-paid-button";
import { OrderPaymentControls } from "@/components/admin/order-payment-controls";
import { StatusBadge, type BadgeTone } from "@/components/admin/page-header";
import { ProductPhoto } from "@/components/product-photo";
import { getAllProducts } from "@/server/repositories/product-repository";
import { DeleteOrderButton } from "@/components/admin/delete-order-button";
import { formatPrice } from "@/lib/format";
import { CHANNEL_LABELS } from "@/lib/channels";
import { createReviewUrl } from "@/server/review-link";
import { firstName } from "@/lib/format";
import type { Order, OrderStatus } from "@/server/types";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackOrders, fallbackProducts } from "@/server/demo-fallback";

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
const TO_SHIP = "a-enviar";
const TO_RECEIVE = "a-receber";

/** Venda lançada no painel (não é do site) cujo pagamento ainda não foi confirmado: é essa que o dono marca como paga à mão. */
function isManualUnpaid(order: Order) {
  return (
    order.channel !== "online" && order.status !== "Cancelado" && ["pending", "in_process"].includes(order.paymentStatus ?? "pending")
  );
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pagamento pendente",
  in_process: "Pagamento em análise",
  approved: "Pago",
  authorized: "Autorizado",
  rejected: "Recusado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
  charged_back: "Chargeback",
  in_mediation: "Em disputa",
};

const PAYMENT_TONES: Record<string, BadgeTone> = {
  approved: "success",
  authorized: "success",
  pending: "warning",
  in_process: "warning",
  rejected: "danger",
  cancelled: "danger",
  charged_back: "danger",
  in_mediation: "danger",
  refunded: "neutral",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}


/** Mensagem pronta pedindo a avaliação, com o link que dispensa login. O cupom de R$ 5 é gerado quando a pessoa avalia. */
function reviewWhatsAppHref(order: Order) {
  const digits = (order.customerPhone ?? "").replace(/\D/g, "");
  const phone = digits ? (digits.length <= 11 ? `55${digits}` : digits) : "";
  const name = firstName(order.customerName ?? order.address?.recipient ?? "tudo bem");
  const message = `Oi, ${name}! Aqui é da Fazaê 3D. Seu pedido ${order.id} chegou direitinho? Conta pra gente o que achou: avalie em um minuto e ganhe R$ 5 de desconto na próxima compra (a partir de R$ 30). ${createReviewUrl(order)}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function matchesQuery(order: Order, query: string) {
  const term = query.toLowerCase();
  return (
    order.id.toLowerCase().includes(term) ||
    Boolean(order.userEmail?.toLowerCase().includes(term)) ||
    Boolean(order.customerName?.toLowerCase().includes(term)) ||
    Boolean(order.address?.recipient.toLowerCase().includes(term)) ||
    Boolean(order.customerPhone?.includes(term.replace(/\D/g, "") || "\u0000"))
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

  const [orders, catalog] = await Promise.all([
    withReadFallback(() => getAllOrders(), fallbackOrders),
    withReadFallback(() => getAllProducts(), fallbackProducts),
  ]);
  // Miniatura só para quem existe na loja: itens avulsos/personalizados não têm foto e ficam sem.
  const photoBySlug = new Map(catalog.filter((p) => p.images && p.images.length > 0).map((p) => [p.slug, p.images![0]]));
  // "A enviar" = já pago, ainda sem código de rastreio e sem ter saído: a fila de trabalho do dia.
  const toShip = (o: Order) => (o.status === "Pagamento aprovado" || o.status === "Em preparação") && !o.tracking;
  const filtered = orders
    .filter((o) => !statusFilter || (statusFilter === TO_SHIP ? toShip(o) : statusFilter === TO_RECEIVE ? isManualUnpaid(o) : o.status === statusFilter))
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
        <div className="flex flex-wrap gap-3">
          <a
            href="/admin/exportar/pedidos"
            className="label-caps border border-mist px-5 py-3 text-xs text-graphite transition-colors hover:border-ink hover:text-ink"
          >
            Exportar CSV
          </a>
          <Link
            href="/admin/vendas/nova"
            className="label-caps border border-ink px-5 py-3 text-xs transition-colors hover:bg-ink hover:text-paper"
          >
            Lançar venda
          </Link>
        </div>
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
        <Link
          href={`/admin/pedidos${buildQueryString({ ...baseParams, status: TO_SHIP })}`}
          className={`label-caps border px-3.5 py-2 text-[11px] transition-colors ${
            statusFilter === TO_SHIP ? "border-petrol bg-petrol text-ink" : "border-petrol/60 text-petrol hover:border-petrol"
          }`}
        >
          A enviar ({orders.filter(toShip).length})
        </Link>
        <Link
          href={`/admin/pedidos${buildQueryString({ ...baseParams, status: TO_RECEIVE })}`}
          className={`label-caps border px-3.5 py-2 text-[11px] transition-colors ${
            statusFilter === TO_RECEIVE ? "border-petrol bg-petrol text-ink" : "border-petrol/60 text-petrol hover:border-petrol"
          }`}
        >
          Falta pagar ({orders.filter(isManualUnpaid).length})
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

      {statusFilter === TO_RECEIVE && filtered.length > 0 && (
        <div className="mb-4">
          <MarkAllPaidButton ids={filtered.map((o) => o.id)} />
        </div>
      )}

      {paginated.length === 0 ? (
        <EmptyState icon="orders" title="Nenhum pedido encontrado" description="Troque o filtro, o período ou a busca para ver mais resultados." action={{ href: "/admin/vendas/nova", label: "Lançar venda" }} />
      ) : (
        <ul className="flex flex-col gap-4">
          {paginated.map((order) => (
            <li key={order.id} className="border border-mist p-5">
              <div className="grid grid-cols-2 gap-4 border-b border-mist pb-4 lg:grid-cols-[1fr_1.5fr_1.1fr_auto] lg:items-start">
                <div className="order-1">
                  <p className="mb-1 text-[11px] text-graphite">Pedido</p>
                  <p className="text-base font-semibold tracking-tight">{order.id}</p>
                  {order.channel !== "online" && (
                    <p className="mt-1.5">
                      <StatusBadge>{CHANNEL_LABELS[order.channel]}</StatusBadge>
                    </p>
                  )}
                </div>
                <div className="order-3 col-span-2 lg:order-2 lg:col-span-1">
                  <p className="mb-1 text-[11px] text-graphite">Cliente</p>
                  <p className="text-base font-medium">{order.customerName ?? order.userEmail ?? "Cliente não identificado"}</p>
                  <p className="mt-0.5 text-xs text-graphite">
                    {formatDate(order.createdAt)}
                    {order.customerPhone ? ` · ${order.customerPhone}` : ""}
                  </p>
                </div>
                <div className="order-4 col-span-2 lg:order-3 lg:col-span-1">
                  <p className="mb-1 text-[11px] text-graphite">Pagamento</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge>{order.paymentMethod.toUpperCase()}</StatusBadge>
                    {order.channel !== "online" && order.status !== "Cancelado" ? (
                      (() => {
                        const received = order.depositAmount ?? 0;
                        const paid = order.paymentStatus === "approved" || received >= order.total;
                        return paid ? (
                          <StatusBadge tone="success">Pago</StatusBadge>
                        ) : received > 0 ? (
                          <StatusBadge tone="warning">Pagamento parcial</StatusBadge>
                        ) : (
                          <StatusBadge tone="warning">Pagamento pendente</StatusBadge>
                        );
                      })()
                    ) : (
                      <StatusBadge tone={PAYMENT_TONES[order.paymentStatus ?? "pending"] ?? "neutral"}>
                        {PAYMENT_STATUS_LABELS[order.paymentStatus ?? "pending"] ?? order.paymentStatus}
                      </StatusBadge>
                    )}
                  </div>
                  {order.channel !== "online" && order.status !== "Cancelado" ? (
                    <OrderPaymentControls
                      id={order.id}
                      total={order.total}
                      received={order.paymentStatus === "approved" ? order.total : Math.min(order.depositAmount ?? 0, order.total)}
                    />
                  ) : null}
                  {order.tracking ? <p className="mt-1.5 text-xs text-graphite">Rastreio {order.tracking}</p> : null}
                </div>
                <div className="order-2 flex flex-col items-end gap-1 text-right lg:order-4">
                  <div>
                    <p className="mb-1 text-[11px] text-graphite">Total</p>
                    <p className="text-lg font-semibold tracking-tight">{formatPrice(order.total)}</p>
                  </div>
                  <DeleteOrderButton id={order.id} />
                </div>
              </div>

              <ul className="divide-y divide-mist py-3">
                {order.items.map((item) => {
                  const photo = photoBySlug.get(item.productSlug);
                  return (
                    <li key={`${item.productSlug}-${item.material}-${item.color}`} className="flex items-center justify-between gap-4 py-2.5">
                      <div className="flex min-w-0 items-center gap-3">
                        {photo ? (
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-mist">
                            <ProductPhoto src={photo} alt={item.name} sizes="44px" />
                          </div>
                        ) : null}
                        <div className="min-w-0">
                          <p className="truncate text-sm text-ink">{item.name}</p>
                          <p className="text-xs text-graphite">
                            {item.categoryName} · {item.material} · {item.color}
                            {item.scale ? ` · ${item.scale}` : ""} · Qtd {item.quantity}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 text-sm text-graphite">{formatPrice(item.price * item.quantity)}</span>
                    </li>
                  );
                })}
              </ul>

              {order.address && (
                <div className="mb-3 border-t border-mist pt-3 text-xs text-graphite">
                  <p>
                    <span className="label-caps text-[10px]">Entrega</span>{" "}
                    {order.shippingMethod ? (
                      <strong className="font-medium text-ink">{order.shippingMethod}</strong>
                    ) : (
                      "—"
                    )}{" "}
                    · {order.shipping === 0 ? "Grátis" : formatPrice(order.shipping)}
                  </p>
                  <p className="mt-0.5">
                    {order.address.recipient} · {order.address.street}, {order.address.number}
                    {order.address.complement ? ` (${order.address.complement})` : ""} · {order.address.neighborhood} ·{" "}
                    {order.address.city}/{order.address.state} · CEP {order.address.zip}
                  </p>
                </div>
              )}

              {order.status === "Entregue" && (
                <div className="mb-3 border-t border-mist pt-4">
                  <a
                    href={reviewWhatsAppHref(order)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-petrol hover:underline"
                  >
                    Pedir avaliação no WhatsApp (cliente ganha R$ 5)
                  </a>
                </div>
              )}

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
