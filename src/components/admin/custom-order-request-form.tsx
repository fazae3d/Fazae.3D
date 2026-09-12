"use client";

import { useState } from "react";
import { updateCustomOrderRequestAction } from "@/app/admin/encomendas/actions";
import { Select } from "@/components/select";
import type { CustomOrderRequest, CustomRequestStatus } from "@/lib/types";

const ALL_STATUSES: CustomRequestStatus[] = ["novo", "em_contato", "orcamento_enviado", "fechado", "perdido"];

export const STATUS_LABELS: Record<CustomRequestStatus, string> = {
  novo: "Novo",
  em_contato: "Em contato",
  orcamento_enviado: "Orçamento enviado",
  fechado: "Fechado",
  perdido: "Perdido",
};

export function CustomOrderRequestForm({ request }: { request: CustomOrderRequest }) {
  const [status, setStatus] = useState<CustomRequestStatus>(request.status);
  const [adminNotes, setAdminNotes] = useState(request.adminNotes ?? "");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const dirty = status !== request.status || adminNotes !== (request.adminNotes ?? "");

  const handleSave = async () => {
    setPending(true);
    setFeedback(null);
    const result = await updateCustomOrderRequestAction(request.id, status, adminNotes);
    setPending(false);
    if (!result.success) {
      setFeedback({ type: "error", message: result.error });
      return;
    }
    setFeedback({ type: "success", message: "Solicitação atualizada." });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="label-caps text-[10px] text-graphite">Status</label>
          <Select
            value={status}
            onChange={(v) => setStatus(v as CustomRequestStatus)}
            className="border border-mist px-2.5 py-2 text-xs focus:border-petrol"
            options={ALL_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
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

      <div className="flex flex-col gap-1">
        <label className="label-caps text-[10px] text-graphite">Notas internas</label>
        <textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          rows={2}
          placeholder="Observações sobre esta solicitação"
          className="w-full border border-mist px-2.5 py-2 text-xs outline-none focus:border-petrol"
        />
      </div>
    </div>
  );
}
