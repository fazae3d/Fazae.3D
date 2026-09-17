"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { registerVisitAction } from "@/app/admin/consignacao/actions";
import type { ConsignmentVisit } from "@/server/types";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function ConsignmentVisitsPanel({
  consigneeId,
  visits,
}: {
  consigneeId: string;
  visits: ConsignmentVisit[];
}) {
  const router = useRouter();
  const [visitDate, setVisitDate] = useState(todayIso());
  const [nextVisitDate, setNextVisitDate] = useState("");
  const [amountCollected, setAmountCollected] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    const result = await registerVisitAction(consigneeId, {
      visitDate,
      nextVisitDate: nextVisitDate || undefined,
      amountCollected: amountCollected ? Number(amountCollected) : undefined,
      notes: notes || undefined,
    });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setVisitDate(todayIso());
    setNextVisitDate("");
    setAmountCollected("");
    setNotes("");
    router.refresh();
  };

  return (
    <div className="border border-mist p-5">
      <p className="label-caps mb-4 text-xs text-graphite">Histórico de visitas {visits.length > 0 && `(${visits.length})`}</p>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <label className="label-caps text-[10px] text-graphite">Data da visita</label>
          <input
            type="date"
            value={visitDate}
            onChange={(e) => setVisitDate(e.target.value)}
            className="border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label-caps text-[10px] text-graphite">Próxima visita (opcional)</label>
          <input
            type="date"
            value={nextVisitDate}
            onChange={(e) => setNextVisitDate(e.target.value)}
            className="border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label-caps text-[10px] text-graphite">Valor recebido (R$)</label>
          <input
            type="number"
            step="0.01"
            min={0}
            value={amountCollected}
            onChange={(e) => setAmountCollected(e.target.value)}
            className="border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label-caps text-[10px] text-graphite">Notas (opcional)</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting || !visitDate}
        className="label-caps border border-ink px-5 py-2.5 text-xs transition-colors hover:bg-ink hover:text-paper disabled:opacity-60"
      >
        {submitting ? "Registrando..." : "Registrar visita"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {visits.length > 0 && (
        <ul className="mt-6 divide-y divide-mist border-t border-mist">
          {visits.map((visit) => (
            <li key={visit.id} className="py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-ink">{formatDate(visit.visitDate)}</p>
                <p className="font-medium">{formatPrice(visit.amountCollected)}</p>
              </div>
              <p className="text-xs text-graphite">
                {visit.nextVisitDate ? `Próxima visita: ${formatDate(visit.nextVisitDate)}` : "Sem próxima visita agendada"}
              </p>
              {visit.notes && <p className="mt-1 text-xs text-graphite">{visit.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
