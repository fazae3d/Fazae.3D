import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { getCustomer, getCustomerActivity } from "@/server/repositories/customer-repository";
import { formatPrice } from "@/lib/format";
import { round2 } from "@/lib/money";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackCustomers, fallbackOrders, fallbackCustomOrderRequests } from "@/server/demo-fallback";
import { CustomerCrmForm } from "@/components/admin/customer-crm-form";
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

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const customer = await withReadFallback(
    () => getCustomer(id),
    fallbackCustomers.find((c) => c.id === id),
  );
  if (!customer) notFound();

  const activity = await withReadFallback(
    () => getCustomerActivity(id),
    {
      customer,
      orders: fallbackOrders.filter((o) => o.customerPhone === customer.phone),
      requests: fallbackCustomOrderRequests.filter((r) => r.phone === customer.phone),
    },
  );
  const orders = activity?.orders ?? [];
  const requests = activity?.requests ?? [];

  const totalSpent = round2(orders.reduce((sum, o) => sum + o.total, 0));
  // "A receber" é um conceito de pagamento, não de fase de produção: soma o saldo
  // (total - sinal) de qualquer pedido em que o sinal recebido não cobre o total.
  const totalReceivable = round2(
    orders.reduce((sum, o) => {
      const balance = o.total - (o.depositAmount ?? 0);
      return balance > 0 ? sum + balance : sum;
    }, 0),
  );

  return (
    <div>
      <Breadcrumb
        items={[
          { label: "Início", href: "/admin" },
          { label: "Clientes", href: "/admin/clientes" },
          { label: customer.name || customer.phone },
        ]}
      />
      <div className="mb-8 mt-4 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl sm:text-3xl">{customer.name || "(sem nome)"}</h1>
        <span className="label-caps text-[10px] text-graphite">
          Cliente desde {formatDate(customer.createdAt)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="border border-mist p-5">
          <p className="label-caps text-[11px] text-graphite">Telefone</p>
          <p className="mt-2 text-sm">{customer.phone}</p>
        </div>
        <div className="border border-mist p-5">
          <p className="label-caps text-[11px] text-graphite">E-mail</p>
          <p className="mt-2 text-sm">{customer.email ?? "Não informado"}</p>
        </div>
        <div className="border border-mist p-5">
          <p className="label-caps text-[11px] text-graphite">Total gasto</p>
          <p className="font-display mt-2 text-2xl">{formatPrice(totalSpent)}</p>
        </div>
        <div className="border border-mist p-5">
          <p className="label-caps text-[11px] text-graphite">A receber</p>
          <p className="font-display mt-2 text-2xl">{formatPrice(totalReceivable)}</p>
        </div>
      </div>

      <div className="mt-8">
        <CustomerCrmForm customer={customer} />
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <p className="label-caps text-[11px] text-graphite">Pedidos</p>
          <Link
            href="/admin/producao"
            className="label-caps text-[11px] text-petrol hover:underline"
          >
            Gerenciar produção
          </Link>
        </div>
        {orders.length === 0 ? (
          <p className="border border-mist p-5 text-sm text-graphite">Este cliente ainda não fez nenhum pedido.</p>
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={order.id} className="border border-mist p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-ink">Pedido {order.id}</p>
                    <p className="text-xs text-graphite">{formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="label-caps text-[10px] text-graphite">{order.status}</span>
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
          <p className="label-caps text-[11px] text-graphite">Solicitações de orçamento</p>
          <Link
            href="/admin/encomendas"
            className="label-caps text-[11px] text-petrol hover:underline"
          >
            Ver encomendas
          </Link>
        </div>
        {requests.length === 0 ? (
          <p className="border border-mist p-5 text-sm text-graphite">
            Este cliente ainda não pediu orçamento personalizado.
          </p>
        ) : (
          <ul className="space-y-3">
            {requests.map((request) => (
              <li key={request.id} className="border border-mist p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="line-clamp-1 text-sm text-ink">{request.description}</p>
                    <p className="text-xs text-graphite">{formatDate(request.createdAt)}</p>
                  </div>
                  <span className="label-caps text-[10px] text-graphite">
                    {REQUEST_STATUS_LABELS[request.status]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
