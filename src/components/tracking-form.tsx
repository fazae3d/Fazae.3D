"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { trackOrderAction } from "@/app/(storefront)/rastreamento/actions";
import { formatPrice } from "@/lib/format";
import type { Order, OrderStatus } from "@/server/types";

const STATUS_SEQUENCE: OrderStatus[] = [
  "Pedido recebido",
  "Pagamento aprovado",
  "Em preparação",
  "Enviado",
  "Em trânsito",
  "Entregue",
];

export function TrackingForm({ initialOrderId = "" }: { initialOrderId?: string }) {
  const { data: session, status: sessionStatus } = useSession();
  const [orderId, setOrderId] = useState(initialOrderId);
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const isGuest = sessionStatus !== "loading" && !session;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim() || (isGuest && !email.trim())) return;
    setLoading(true);
    setNotFound(false);
    const result = await trackOrderAction(orderId, isGuest ? email : undefined);
    setLoading(false);
    if (!result.found) {
      setOrder(null);
      setNotFound(true);
      return;
    }
    setOrder(result.order);
  };

  const currentIndex = order ? STATUS_SEQUENCE.indexOf(order.status) : -1;

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="Número do pedido (ex: CRI-123456)"
          className="flex-1 border border-paper/15 bg-mist px-3 py-3 text-base text-paper outline-none placeholder:text-paper/40 focus:border-petrol sm:text-sm"
        />
        {isGuest && (
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail usado na compra"
            className="flex-1 border border-paper/15 bg-mist px-3 py-3 text-base text-paper outline-none placeholder:text-paper/40 focus:border-petrol sm:text-sm"
          />
        )}
        <button
          type="submit"
          disabled={loading}
          className="label-caps border border-petrol px-6 py-3 text-xs text-petrol transition-colors hover:bg-petrol hover:text-ink disabled:opacity-60"
        >
          {loading ? "..." : "Rastrear"}
        </button>
      </form>

      {notFound && (
        <p className="mt-4 text-sm text-red-600">
          Pedido não encontrado. Verifique o número{isGuest ? " e o e-mail usado na compra" : ""} e tente novamente.
        </p>
      )}

      {order && (
        <div className="mt-10 border border-paper/15 p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-paper">Pedido {order.id}</p>
              <p className="text-xs text-graphite">
                {new Date(order.createdAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <p className="text-sm font-medium text-paper">{formatPrice(order.total)}</p>
          </div>

          {order.status === "Cancelado" ? (
            <p className="label-caps border border-red-200 bg-red-50 px-4 py-3 text-[11px] text-red-600">
              Pedido cancelado
            </p>
          ) : (
            <ol className="space-y-4">
              {STATUS_SEQUENCE.map((status, i) => (
                <li key={status} className="flex items-center gap-3">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${
                      i <= currentIndex ? "bg-petrol text-ink" : "border border-paper/15 text-graphite"
                    }`}
                  >
                    {i <= currentIndex ? "✓" : i + 1}
                  </span>
                  <span className={`text-sm ${i <= currentIndex ? "text-paper" : "text-graphite"}`}>{status}</span>
                </li>
              ))}
            </ol>
          )}

          {order.tracking && (
            <p className="mt-6 border-t border-paper/15 pt-4 text-xs text-graphite">
              Código de rastreio: <span className="text-paper">{order.tracking}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
