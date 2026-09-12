"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAdditionalCostAction, deleteAdditionalCostAction } from "@/app/admin/configuracoes/actions";
import { formatPrice } from "@/lib/format";
import type { AdditionalCost } from "@/server/types";

export function AdditionalCostsManager({ additionalCosts }: { additionalCosts: AdditionalCost[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async () => {
    setError(null);
    setSubmitting(true);
    const result = await createAdditionalCostAction({ name: name.trim(), value: Number(value) || 0 });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setName("");
    setValue("");
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteAdditionalCostAction(id);
    setDeletingId(null);
    router.refresh();
  };

  return (
    <div className="border-t border-mist pt-6">
      <p className="label-caps mb-1 text-xs text-graphite">
        Custos adicionais {additionalCosts.length > 0 && `(${additionalCosts.length})`}
      </p>
      <p className="mb-4 text-xs text-graphite">
        Custos extras reutilizáveis (argolas, ímãs, embalagens, parafusos...) que podem ser somados rapidamente na
        calculadora de precificação.
      </p>

      {additionalCosts.length > 0 && (
        <ul className="mb-4 divide-y divide-mist border border-mist">
          {additionalCosts.map((cost) => (
            <li key={cost.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span>{cost.name}</span>
              <div className="flex items-center gap-4">
                <span className="text-graphite">{formatPrice(cost.value)}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(cost.id)}
                  disabled={deletingId === cost.id}
                  className="label-caps text-[11px] text-graphite hover:text-red-600 disabled:opacity-60"
                >
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <label className="label-caps text-[11px] text-graphite" htmlFor="new-cost-name">
            Nome do custo
          </label>
          <input
            id="new-cost-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Argola para chaveiro"
            className="border border-mist px-3 py-2 text-sm outline-none focus:border-petrol"
          />
        </div>
        <div className="flex w-32 flex-col gap-1.5">
          <label className="label-caps text-[11px] text-graphite" htmlFor="new-cost-value">
            Valor (R$)
          </label>
          <input
            id="new-cost-value"
            type="number"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="border border-mist px-3 py-2 text-sm outline-none focus:border-petrol"
          />
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={submitting || !name.trim()}
          className="label-caps border border-ink px-5 py-2.5 text-xs transition-colors hover:bg-ink hover:text-paper disabled:opacity-60"
        >
          {submitting ? "Adicionando..." : "Adicionar"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
