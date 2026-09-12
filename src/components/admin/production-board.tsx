"use client";

import { Fragment, useState } from "react";
import type { Order } from "@/server/types";
import type { ProductionStage } from "@/generated/prisma/client";
import { formatPrice } from "@/lib/format";
import { updateProductionAction } from "@/app/admin/producao/actions";
import { KanbanBoard, type KanbanColumn } from "@/components/admin/kanban-board";
import { Select } from "@/components/select";

const STAGE_COLUMNS: KanbanColumn[] = [
  { key: "inicio", label: "Início" },
  { key: "em_producao", label: "Em produção" },
  { key: "finalizado", label: "Finalizado" },
];

const STAGE_LABELS: Record<ProductionStage, string> = {
  nao_aplicavel: "Não aplicável",
  inicio: "Início",
  em_producao: "Em produção",
  finalizado: "Finalizado",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function itemsSummary(order: Order) {
  return order.items.map((item) => `${item.name} x${item.quantity}`).join(", ");
}

function deadlineClass(deadline: string | undefined) {
  if (!deadline) return "text-graphite";
  const diffDays = (new Date(deadline).getTime() - Date.now()) / 86_400_000;
  if (diffDays < 0) return "text-red-500";
  if (diffDays <= 3) return "text-amber-400";
  return "text-graphite";
}

function toDateInputValue(iso: string | undefined) {
  return iso ? iso.slice(0, 10) : "";
}

function EditForm({
  order,
  onSave,
}: {
  order: Order;
  onSave: (data: { stage?: ProductionStage; deadline?: string | null; depositAmount?: number }) => void;
}) {
  const [deadline, setDeadline] = useState(toDateInputValue(order.productionDeadline));
  const [depositAmount, setDepositAmount] = useState(String(order.depositAmount ?? 0));
  const [pending, setPending] = useState(false);

  const handleSave = async () => {
    setPending(true);
    await onSave({ deadline: deadline || null, depositAmount: Number(depositAmount) || 0 });
    setPending(false);
  };

  return (
    <div className="flex flex-wrap items-end gap-3 border-t border-mist pt-3">
      <div className="flex flex-col gap-1">
        <label className="label-caps text-[10px] text-graphite">Prazo</label>
        <input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="border border-mist bg-paper px-2.5 py-2 text-xs outline-none focus:border-petrol"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="label-caps text-[10px] text-graphite">Sinal recebido (R$)</label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          className="w-32 border border-mist bg-paper px-2.5 py-2 text-xs outline-none focus:border-petrol"
        />
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={pending}
        className="label-caps border border-ink px-4 py-2 text-[11px] transition-colors hover:bg-ink hover:text-paper disabled:opacity-40"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </div>
  );
}

export function ProductionBoard({ orders: initialOrders }: { orders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [view, setView] = useState<"lista" | "kanban">("lista");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyLocalUpdate = (
    orderId: string,
    data: { stage?: ProductionStage; deadline?: string | null; depositAmount?: number },
  ) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? {
              ...order,
              ...(data.stage !== undefined ? { productionStage: data.stage } : {}),
              ...(data.deadline !== undefined ? { productionDeadline: data.deadline ?? undefined } : {}),
              ...(data.depositAmount !== undefined ? { depositAmount: data.depositAmount } : {}),
            }
          : order,
      ),
    );
  };

  const handleUpdate = async (
    orderId: string,
    data: { stage?: ProductionStage; deadline?: string | null; depositAmount?: number },
  ) => {
    const previous = orders;
    setError(null);
    applyLocalUpdate(orderId, data);
    const result = await updateProductionAction(orderId, data);
    if (!result.success) {
      setOrders(previous);
      setError(result.error);
    }
  };

  const handleMove = (orderId: string, newColumnKey: string) => {
    void handleUpdate(orderId, { stage: newColumnKey as ProductionStage });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setView("lista")}
          className={`label-caps border px-3.5 py-2 text-[11px] transition-colors ${
            view === "lista" ? "border-ink bg-ink text-paper" : "border-mist text-graphite hover:border-ink"
          }`}
        >
          Lista
        </button>
        <button
          type="button"
          onClick={() => setView("kanban")}
          className={`label-caps border px-3.5 py-2 text-[11px] transition-colors ${
            view === "kanban" ? "border-ink bg-ink text-paper" : "border-mist text-graphite hover:border-ink"
          }`}
        >
          Kanban
        </button>
      </div>

      {error && <p className="mb-4 text-[11px] text-red-500">{error}</p>}

      {orders.length === 0 ? (
        <div className="border border-mist px-6 py-16 text-center text-graphite">
          Nenhum pedido em produção no momento.
        </div>
      ) : view === "lista" ? (
        <div className="overflow-x-auto border border-mist">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-mist bg-mist/30">
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Cliente</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Itens</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Prazo</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Saldo a receber</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Fase</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {orders.map((order) => (
                <Fragment key={order.id}>
                  <tr>
                    <td className="px-4 py-3">{order.customerName ?? order.userEmail ?? "Não identificado"}</td>
                    <td className="max-w-[260px] truncate px-4 py-3 text-graphite" title={itemsSummary(order)}>
                      {itemsSummary(order)}
                    </td>
                    <td className={`px-4 py-3 ${deadlineClass(order.productionDeadline)}`}>
                      {order.productionDeadline ? formatDate(order.productionDeadline) : "Sem prazo"}
                    </td>
                    <td className="px-4 py-3">{formatPrice(order.total - (order.depositAmount ?? 0))}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={order.productionStage ?? "inicio"}
                        onChange={(v) => handleUpdate(order.id, { stage: v as ProductionStage })}
                        className="border border-mist bg-paper px-2 py-1.5 text-xs focus:border-petrol"
                        options={STAGE_COLUMNS.map((col) => ({
                          value: col.key,
                          label: STAGE_LABELS[col.key as ProductionStage],
                        }))}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setEditingId(editingId === order.id ? null : order.id)}
                        className="label-caps text-[11px] text-graphite hover:text-petrol"
                      >
                        {editingId === order.id ? "Fechar" : "Editar"}
                      </button>
                    </td>
                  </tr>
                  {editingId === order.id && (
                    <tr>
                      <td colSpan={6} className="bg-mist/10 px-4 py-3">
                        <EditForm order={order} onSave={(data) => handleUpdate(order.id, data)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <KanbanBoard
          columns={STAGE_COLUMNS}
          items={orders}
          getItemId={(order) => order.id}
          getItemColumn={(order) => order.productionStage ?? "inicio"}
          onMove={handleMove}
          renderCard={(order) => (
            <div className="flex flex-col gap-2">
              <p className="text-ink">{order.customerName ?? order.userEmail ?? "Não identificado"}</p>
              <p className="text-graphite" title={itemsSummary(order)}>
                {itemsSummary(order)}
              </p>
              <p className={deadlineClass(order.productionDeadline)}>
                {order.productionDeadline ? formatDate(order.productionDeadline) : "Sem prazo"}
              </p>
              <p className="text-ink">{formatPrice(order.total - (order.depositAmount ?? 0))} a receber</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(editingId === order.id ? null : order.id);
                }}
                className="label-caps self-start text-[10px] text-graphite hover:text-petrol"
              >
                {editingId === order.id ? "Fechar" : "Editar"}
              </button>
              {editingId === order.id && (
                <div onPointerDown={(e) => e.stopPropagation()}>
                  <EditForm order={order} onSave={(data) => handleUpdate(order.id, data)} />
                </div>
              )}
            </div>
          )}
        />
      )}
    </div>
  );
}
