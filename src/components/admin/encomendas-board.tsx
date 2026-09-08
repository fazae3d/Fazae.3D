"use client";

import { useState } from "react";
import type { CustomOrderRequest, CustomRequestStatus } from "@/lib/types";
import { updateCustomOrderRequestAction } from "@/app/admin/encomendas/actions";
import { CustomOrderRequestForm, STATUS_LABELS } from "@/components/admin/custom-order-request-form";
import { getWhatsAppLink } from "@/lib/site-config";
import { KanbanBoard, type KanbanColumn } from "@/components/admin/kanban-board";

const STATUS_COLUMNS: KanbanColumn[] = (
  ["novo", "em_contato", "orcamento_enviado", "fechado", "perdido"] as CustomRequestStatus[]
).map((status) => ({ key: status, label: STATUS_LABELS[status] }));

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EncomendasBoard({ requests: initialRequests }: { requests: CustomOrderRequest[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [view, setView] = useState<"lista" | "kanban">("lista");
  const [error, setError] = useState<string | null>(null);

  const handleMove = async (id: string, newColumnKey: string) => {
    const previous = requests;
    const newStatus = newColumnKey as CustomRequestStatus;
    const target = previous.find((r) => r.id === id);
    setError(null);
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
    const result = await updateCustomOrderRequestAction(id, newStatus, target?.adminNotes ?? "");
    if (!result.success) {
      setRequests(previous);
      setError(result.error);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
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

      {requests.length === 0 ? (
        <div className="border border-mist px-6 py-16 text-center text-graphite">
          Nenhuma solicitação recebida ainda.
        </div>
      ) : view === "lista" ? (
        <ul className="flex flex-col gap-4">
          {requests.map((request) => (
            <li key={request.id} className="border border-mist p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-mist pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-ink">{request.name}</p>
                    <span className="label-caps border border-mist px-2 py-0.5 text-[10px] text-graphite">
                      {STATUS_LABELS[request.status]}
                    </span>
                  </div>
                  <p className="text-xs text-graphite">
                    {request.phone} · {formatDate(request.createdAt)}
                  </p>
                </div>
                <a
                  href={getWhatsAppLink(request.phone)}
                  target="_blank"
                  rel="noreferrer"
                  className="label-caps border border-ink px-4 py-2 text-[11px] transition-colors hover:bg-ink hover:text-paper"
                >
                  Abrir WhatsApp
                </a>
              </div>

              <div className="border-b border-mist py-4 text-sm text-graphite">
                <p>{request.description}</p>
                <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                  {request.materialPreference && (
                    <div className="flex gap-1.5">
                      <dt className="text-ink">Material:</dt>
                      <dd>{request.materialPreference}</dd>
                    </div>
                  )}
                  {request.colorPreference && (
                    <div className="flex gap-1.5">
                      <dt className="text-ink">Cor:</dt>
                      <dd>{request.colorPreference}</dd>
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    <dt className="text-ink">Quantidade:</dt>
                    <dd>{request.quantity}</dd>
                  </div>
                  {request.desiredDeadline && (
                    <div className="flex gap-1.5">
                      <dt className="text-ink">Prazo desejado:</dt>
                      <dd>{request.desiredDeadline}</dd>
                    </div>
                  )}
                  {request.email && (
                    <div className="flex gap-1.5">
                      <dt className="text-ink">E-mail:</dt>
                      <dd>{request.email}</dd>
                    </div>
                  )}
                  {request.referenceProductSlug && (
                    <div className="flex gap-1.5">
                      <dt className="text-ink">Produto de referência:</dt>
                      <dd>{request.referenceProductSlug}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="pt-4">
                <CustomOrderRequestForm request={request} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <KanbanBoard
          columns={STATUS_COLUMNS}
          items={requests}
          getItemId={(request) => request.id}
          getItemColumn={(request) => request.status}
          onMove={handleMove}
          renderCard={(request) => (
            <div className="flex flex-col gap-1.5">
              <p className="text-ink">{request.name}</p>
              <p className="text-graphite">{request.phone}</p>
              <p className="line-clamp-2 text-graphite">{request.description}</p>
              {request.desiredDeadline && <p className="text-graphite">Prazo: {request.desiredDeadline}</p>}
            </div>
          )}
        />
      )}
    </div>
  );
}
