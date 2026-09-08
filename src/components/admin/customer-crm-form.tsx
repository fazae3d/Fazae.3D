"use client";

import { useState } from "react";
import { updateCustomerNotesAction } from "@/app/admin/clientes/actions";
import type { Customer } from "@/server/types";

export function CustomerCrmForm({ customer }: { customer: Customer }) {
  const [notes, setNotes] = useState(customer.notes ?? "");
  const [tagsRaw, setTagsRaw] = useState(customer.tags.join(", "));
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const dirty = notes !== (customer.notes ?? "") || tagsRaw !== customer.tags.join(", ");

  const handleSave = async () => {
    setPending(true);
    setFeedback(null);
    const result = await updateCustomerNotesAction(customer.id, { notes, tagsRaw });
    setPending(false);
    if (!result.success) {
      setFeedback({ type: "error", message: result.error });
      return;
    }
    setFeedback({ type: "success", message: "Cliente atualizado." });
  };

  return (
    <div className="flex flex-col gap-3 border border-mist p-5">
      <p className="label-caps text-[11px] text-graphite">Notas e tags (CRM)</p>

      <div className="flex flex-col gap-1">
        <label className="label-caps text-[10px] text-graphite">Notas internas</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Observações sobre este cliente"
          className="w-full border border-mist px-2.5 py-2 text-sm outline-none focus:border-petrol"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="label-caps text-[10px] text-graphite">Tags (separadas por vírgula)</label>
        <input
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
          placeholder="fiel, atacado, presencial"
          className="w-full border border-mist px-2.5 py-2 text-sm outline-none focus:border-petrol"
        />
      </div>

      <div className="flex items-center gap-3">
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
    </div>
  );
}
