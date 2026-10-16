import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { PageHeader, StatusBadge } from "@/components/admin/page-header";
import { getCustomer, getCustomerActivity } from "@/server/repositories/customer-repository";
import { getAllQuotes } from "@/server/repositories/quote-repository";
import { formatPrice } from "@/lib/format";
import { round2 } from "@/lib/money";
import { buildCustomerMetrics, daysSince, isInactive, phoneKey } from "@/lib/customer-insights";
import { QUOTE_STATUS_LABELS, formatStoreDate, quoteDisplayStatus, quoteNumberLabel } from "@/lib/quote";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackCustomers, fallbackOrders, fallbackCustomOrderRequests } from "@/server/demo-fallback";
import { CustomerCrmForm } from "@/components/admin/customer-crm-form";
import { QUOTE_TONES } from "../../orcamentos/quote-tones";
import type { CustomRequestStatus } from "@/lib/types";

const REQUEST_STATUS_LABELS: Record<CustomRequestStatus, string> = {
  novo: "Novo",
  em_contato: "Em contato",
  orcamento_enviado: "Orçamento enviado",
  fechado: "Fechado",
  perdido: "Perdido",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function whatsappDigits(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  return digits.length <= 11 ? `55${digits}` : digits;
}

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const customer = await withReadFallback(
    () => getCustomer(id),
    fallbackCustomers.find((c) => c.id === id),
  );
  if (!customer) notFound();

  const [activity, allQuotes] = await Promise.all([
    withReadFallback(() => getCustomerActivity(id), {
      customer,
      orders: fallbackOrders.filter((o) => o.customerPhone === customer.phone),
      requests: fallbackCustomOrderRequests.filter((r) => r.phone === customer.phone),
    }),
    withReadFallback(() => getAllQuotes(), []),
  ]);
  const orders = activity?.orders ?? [];
  const requests = activity?.requests ?? [];
  const key = phoneKey(customer.phone);
  const email = customer.email?.trim().toLowerCase();
  const quotes = allQuotes.filter(
    (q) => (key && phoneKey(q.customerPhone) === key) || (email && q.customerEmail?.trim().toLowerCase() === email),
  );

  const metrics = buildCustomerMetrics([customer], orders).get(customer.id)!;
  const now = new Date();
  // "A receber" é um conceito de pagamento, não de fase de produção: soma o saldo
  // (total - sinal) de qualquer pedido em que o sinal recebido não cobre o total.
  const totalReceivable = round2(
    orders.reduce((sum, o) => {
      if (o.status === "Cancelado") return sum;
      const balance = o.total - (o.depositAmount ?? 0);
      return balance > 0 && o.channel !== "online" ? sum + balance : sum;
    }, 0),
  );

  const kpis = [
    { label: "Total gasto", value: formatPrice(metrics.totalSpent), sub: `${metrics.orderCount} compra(s)` },
    { label: "Ticket médio", value: formatPrice(metrics.averageTicket), sub: "por compra" },
    {
      label: "Última compra",
      value: metrics.lastOrderAt ? formatStoreDate(metrics.lastOrderAt) : "—",
      sub: metrics.lastOrderAt ? `há ${daysSince(metrics.lastOrderAt, now)} dias` : "ainda não comprou",
    },
    { label: "A receber", value: formatPrice(totalReceivable), sub: "saldo de vendas lançadas" },
  ];

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Início", href: "/admin" },
          { label: "Clientes", href: "/admin/clientes" },
          { label: customer.name || customer.phone },
        ]}
      />
      <div className="mt-4">
        <PageHeader
          title={customer.name || "(sem nome)"}
          description={
            <span className="inline-flex flex-wrap items-center gap-2">
              {metrics.orderCount === 0 ? (
                <StatusBadge>Ainda não comprou</StatusBadge>
              ) : isInactive(metrics, now) ? (
                <StatusBadge tone="warning">Parado há mais de 120 dias</StatusBadge>
              ) : (
                <StatusBadge tone="success">Cliente ativo</StatusBadge>
              )}
              <span>
                {customer.phone}
                {customer.email ? ` · ${customer.email}` : ""} · cliente desde {formatDate(customer.createdAt)}
              </span>
            </span>
          }
          actions={
            <>
              <a
                href={`https://wa.me/${whatsappDigits(customer.phone)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-mist px-3.5 py-2 text-sm transition-colors hover:border-petrol"
              >
                Abrir WhatsApp
              </a>
              <Link
                href={`/admin/orcamentos/novo?cliente=${customer.id}`}
                className="rounded-lg bg-petrol px-3.5 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
              >
                Novo orçamento
              </Link>
            </>
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="admin-card rounded-xl border border-mist p-4">
            <p className="text-xs text-graphite">{kpi.label}</p>
            <p className="mt-1 text-xl font-semibold tracking-tight">{kpi.value}</p>
            <p className="mt-0.5 text-xs text-graphite">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <CustomerCrmForm customer={customer} />
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Pedidos ({orders.length})</h2>
          <Link href="/admin/producao" className="text-sm text-petrol hover:underline">
            Gerenciar produção
          </Link>
        </div>
        {orders.length === 0 ? (
          <p className="admin-card rounded-xl border border-mist p-5 text-sm text-graphite">Este cliente ainda não fez nenhum pedido.</p>
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={order.id} className="admin-card rounded-xl border border-mist p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Link href={`/admin/pedidos?q=${order.id}`} className="text-sm font-medium hover:text-petrol">
                      Pedido {order.id}
                    </Link>
                    <p className="text-xs text-graphite">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge>{order.status}</StatusBadge>
                    <span className="text-sm font-medium">{formatPrice(order.total)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Orçamentos ({quotes.length})</h2>
          <Link href="/admin/orcamentos" className="text-sm text-petrol hover:underline">
            Ver todos
          </Link>
        </div>
        {quotes.length === 0 ? (
          <p className="admin-card rounded-xl border border-mist p-5 text-sm text-graphite">Nenhum orçamento para este cliente.</p>
        ) : (
          <ul className="space-y-3">
            {quotes.map((quote) => {
              const status = quoteDisplayStatus(quote);
              return (
                <li key={quote.id} className="admin-card rounded-xl border border-mist p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Link href={`/admin/orcamentos/${quote.id}`} className="text-sm font-medium hover:text-petrol">
                        {quoteNumberLabel(quote.number)}
                        {quote.title ? ` · ${quote.title}` : ""}
                      </Link>
                      <p className="text-xs text-graphite">
                        {formatDate(quote.createdAt)} · válido até {formatStoreDate(quote.validUntil)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge tone={QUOTE_TONES[status]}>{QUOTE_STATUS_LABELS[status]}</StatusBadge>
                      <span className="text-sm font-medium">{formatPrice(quote.total)}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Encomendas pelo site ({requests.length})</h2>
          <Link href="/admin/encomendas" className="text-sm text-petrol hover:underline">
            Ver encomendas
          </Link>
        </div>
        {requests.length === 0 ? (
          <p className="admin-card rounded-xl border border-mist p-5 text-sm text-graphite">Este cliente ainda não pediu peça personalizada.</p>
        ) : (
          <ul className="space-y-3">
            {requests.map((request) => (
              <li key={request.id} className="admin-card rounded-xl border border-mist p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="line-clamp-1 text-sm">{request.description}</p>
                    <p className="text-xs text-graphite">{formatDate(request.createdAt)}</p>
                  </div>
                  <StatusBadge>{REQUEST_STATUS_LABELS[request.status]}</StatusBadge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
