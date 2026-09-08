"use client";

import { useState } from "react";
import { updateOrderStatusAction } from "@/app/admin/pedidos/actions";
import type { Order, OrderStatus } from "@/server/types";

const ALL_STATUSES: OrderStatus[] = [
  "Pedido recebido",
  "Pagamento aprovado",
  "Em preparação",
  "Enviado",
  "Em trânsito",
  "Entregue",
  "Cancelado",
];

export function OrderStatusForm({ order }: { order: Order }) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [tracking, setTracking] = useState(order.tracking ?? "");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const dirty = status !== order.status || tracking !== (order.tracking ?? "");

  const handleSave = async () => {
    setPending(true);
    setFeedback(null);
    const result = await updateOrderStatusAction(order.id, status, tracking);
    setPending(false);
    if (!result.success) {
      setFeedback({ type: "error", message: result.error });
      return;
    }
    setFeedback({ type: "success", message: "Pedido atualizado." });
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="label-caps text-[10px] text-graphite">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus)}
          className="border border-mist px-2.5 py-2 text-xs outline-none focus:border-petrol"
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="label-caps text-[10px] text-graphite">Código de rastreio</label>
        <input
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="Opcional"
          className="w-40 border border-mist px-2.5 py-2 text-xs outline-none focus:border-petrol"
        />
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={!dirty || pending}
        className="label-caps border border-ink px-4 py-2 text-[11px] transition-colors hover:bg-ink hover:text-paper disabled:opacity-40"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>

      {feedback && (
        <span className={`text-[11px] ${feedback.type === "success" ? "text-petrol" : "text-red-600"}`}>
          {feedback.message}
        </span>
      )}
    </div>
  );
}
