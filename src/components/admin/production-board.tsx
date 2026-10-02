"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Order, ProductionItem } from "@/server/types";
import type { ProductionStage } from "@/generated/prisma/client";
import { formatPrice } from "@/lib/format";
import {
  updateProductionAction,
  updateProductionItemAction,
  deleteProductionItemAction,
} from "@/app/admin/producao/actions";
import { KanbanBoard, type KanbanColumn } from "@/components/admin/kanban-board";
import { Select } from "@/components/select";
import { ProductionSaleDialog, type SaleProduct } from "@/components/admin/production-sale-dialog";

export type ProductionCard =
  | { kind: "order"; id: string; order: Order }
  | { kind: "item"; id: string; item: ProductionItem };

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
  // Deadlines come from a date input stored as UTC midnight — formatting in the local zone shows the previous day.
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
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

function cardColumn(card: ProductionCard): string {
  return card.kind === "order" ? (card.order.productionStage ?? "inicio") : card.item.stage;
}

function OrderEditForm({
  order,
  onSave,
}: {
  order: Order;
  onSave: (data: { deadline?: string | null; depositAmount?: number }) => void;
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

function ItemEditForm({
  item,
  onSave,
  onDelete,
  onLaunchSale,
}: {
  item: ProductionItem;
  onSave: (data: { deadline?: string | null; quantity?: number; notes?: string }) => void;
  onDelete: () => void;
  onLaunchSale: () => void;
}) {
  const [deadline, setDeadline] = useState(toDateInputValue(item.deadline));
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [notes, setNotes] = useState(item.notes ?? "");
  const [pending, setPending] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleSave = async () => {
    setPending(true);
    await onSave({ deadline: deadline || null, quantity: Number(quantity) || 1, notes: notes || undefined });
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
        <label className="label-caps text-[10px] text-graphite">Quantidade</label>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-24 border border-mist bg-paper px-2.5 py-2 text-xs outline-none focus:border-petrol"
        />
      </div>
      <div className="flex flex-1 min-w-[160px] flex-col gap-1">
        <label className="label-caps text-[10px] text-graphite">Notas</label>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="border border-mist bg-paper px-2.5 py-2 text-xs outline-none focus:border-petrol"
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
      <button
        type="button"
        onClick={onLaunchSale}
        className="label-caps border border-petrol px-4 py-2 text-[11px] text-petrol transition-colors hover:bg-petrol hover:text-ink"
      >
        Lançar como venda
      </button>
      {confirmingDelete ? (
        <span className="flex items-center gap-2 text-[11px]">
          <span className="text-graphite">Excluir?</span>
          <button onClick={onDelete} className="label-caps text-red-600 hover:underline">
            Sim
          </button>
          <button onClick={() => setConfirmingDelete(false)} className="label-caps text-graphite hover:underline">
            Não
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmingDelete(true)}
          className="label-caps text-[11px] text-graphite hover:text-red-600"
        >
          Excluir
        </button>
      )}
    </div>
  );
}

export function ProductionBoard({ cards: initialCards, products }: { cards: ProductionCard[]; products: SaleProduct[] }) {
  const router = useRouter();
  const [cards, setCards] = useState(initialCards);
  const [sellingId, setSellingId] = useState<string | null>(null);
  // Re-sync whenever the server component hands us a fresh array (e.g. after
  // router.refresh() following the "novo item" form) — local state otherwise
  // only reflects props from the initial mount.
  useEffect(() => setCards(initialCards), [initialCards]);
  const [view, setView] = useState<"lista" | "kanban">("lista");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyLocalStage = (id: string, stage: ProductionStage) => {
    setCards((prev) =>
      prev.map((card) => {
        if (card.id !== id) return card;
        return card.kind === "order"
          ? { ...card, order: { ...card.order, productionStage: stage } }
          : { ...card, item: { ...card.item, stage } };
      }),
    );
  };

  const handleOrderSave = async (
    orderId: string,
    data: { stage?: ProductionStage; deadline?: string | null; depositAmount?: number },
  ) => {
    setError(null);
    if (data.stage) applyLocalStage(orderId, data.stage);
    const result = await updateProductionAction(orderId, data);
    if (!result.success) setError(result.error);
  };

  const handleItemSave = async (
    id: string,
    data: { stage?: ProductionStage; deadline?: string | null; quantity?: number; notes?: string },
  ) => {
    setError(null);
    if (data.stage) applyLocalStage(id, data.stage);
    const result = await updateProductionItemAction(id, data);
    if (!result.success) setError(result.error);
  };

  const handleItemDelete = async (id: string) => {
    setError(null);
    const result = await deleteProductionItemAction(id);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setCards((prev) => prev.filter((card) => card.id !== id));
  };

  const handleMove = (id: string, newColumnKey: string) => {
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    if (card.kind === "order") {
      void handleOrderSave(card.order.id, { stage: newColumnKey as ProductionStage });
    } else {
      void handleItemSave(card.item.id, { stage: newColumnKey as ProductionStage });
    }
  };

  function renderEditForm(card: ProductionCard) {
    if (card.kind === "order") {
      return <OrderEditForm order={card.order} onSave={(data) => handleOrderSave(card.order.id, data)} />;
    }
    return (
      <ItemEditForm
        item={card.item}
        onSave={(data) => handleItemSave(card.item.id, data)}
        onDelete={() => handleItemDelete(card.item.id)}
        onLaunchSale={() => setSellingId(card.item.id)}
      />
    );
  }

  function renderCardContent(card: ProductionCard) {
    if (card.kind === "order") {
      const order = card.order;
      return (
        <div className="flex flex-col gap-2">
          <p className="text-ink">{order.customerName ?? order.userEmail ?? "Não identificado"}</p>
          <p className="text-graphite" title={itemsSummary(order)}>
            {itemsSummary(order)}
          </p>
          <p className={deadlineClass(order.productionDeadline)}>
            {order.productionDeadline ? formatDate(order.productionDeadline) : "Sem prazo"}
          </p>
          <p className="text-ink">{formatPrice(order.total - (order.depositAmount ?? 0))} a receber</p>
        </div>
      );
    }
    const item = card.item;
    return (
      <div className="flex flex-col gap-2">
        <p className="text-ink">{item.description}</p>
        <p className="label-caps text-[10px] text-graphite">Interno · Qtd {item.quantity}</p>
        <p className={deadlineClass(item.deadline)}>{item.deadline ? formatDate(item.deadline) : "Sem prazo"}</p>
      </div>
    );
  }

  const sellingCard = cards.find((c) => c.kind === "item" && c.id === sellingId);

  return (
    <div>
      {sellingCard && sellingCard.kind === "item" && (
        <ProductionSaleDialog
          item={sellingCard.item}
          product={products.find((p) => p.slug === sellingCard.item.productSlug)}
          onClose={() => setSellingId(null)}
          onDone={() => {
            setSellingId(null);
            setEditingId(null);
            router.refresh();
          }}
        />
      )}

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

      {cards.length === 0 ? (
        <div className="border border-mist px-6 py-16 text-center text-graphite">
          Nenhum pedido ou item em produção no momento.
        </div>
      ) : view === "lista" ? (
        <div className="overflow-x-auto border border-mist">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-mist bg-mist/30">
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Origem</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Cliente / Descrição</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Itens</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Prazo</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Saldo a receber</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Fase</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {cards.map((card) => (
                <Fragment key={card.id}>
                  <tr>
                    <td className="px-4 py-3">
                      <span className="label-caps text-[10px] text-graphite">
                        {card.kind === "order" ? "Pedido" : "Interno"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {card.kind === "order"
                        ? (card.order.customerName ?? card.order.userEmail ?? "Não identificado")
                        : card.item.description}
                    </td>
                    <td
                      className="max-w-[260px] truncate px-4 py-3 text-graphite"
                      title={card.kind === "order" ? itemsSummary(card.order) : `Qtd ${card.item.quantity}`}
                    >
                      {card.kind === "order" ? itemsSummary(card.order) : `Qtd ${card.item.quantity}`}
                    </td>
                    <td
                      className={`px-4 py-3 ${deadlineClass(card.kind === "order" ? card.order.productionDeadline : card.item.deadline)}`}
                    >
                      {(() => {
                        const deadline = card.kind === "order" ? card.order.productionDeadline : card.item.deadline;
                        return deadline ? formatDate(deadline) : "Sem prazo";
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      {card.kind === "order" ? formatPrice(card.order.total - (card.order.depositAmount ?? 0)) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={cardColumn(card)}
                        onChange={(v) => handleMove(card.id, v)}
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
                        onClick={() => setEditingId(editingId === card.id ? null : card.id)}
                        className="label-caps text-[11px] text-graphite hover:text-petrol"
                      >
                        {editingId === card.id ? "Fechar" : "Editar"}
                      </button>
                    </td>
                  </tr>
                  {editingId === card.id && (
                    <tr>
                      <td colSpan={7} className="bg-mist/10 px-4 py-3">
                        {renderEditForm(card)}
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
          items={cards}
          getItemId={(card) => card.id}
          getItemColumn={cardColumn}
          onMove={handleMove}
          renderCard={(card) => (
            <div className="flex flex-col gap-2">
              {renderCardContent(card)}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(editingId === card.id ? null : card.id);
                }}
                className="label-caps self-start text-[10px] text-graphite hover:text-petrol"
              >
                {editingId === card.id ? "Fechar" : "Editar"}
              </button>
              {editingId === card.id && (
                <div onPointerDown={(e) => e.stopPropagation()}>{renderEditForm(card)}</div>
              )}
            </div>
          )}
        />
      )}
    </div>
  );
}
