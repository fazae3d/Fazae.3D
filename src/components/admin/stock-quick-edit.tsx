"use client";

import { useState, useTransition } from "react";
import { updateStockAction } from "@/app/admin/estoque/actions";

export function StockQuickEdit({ slug, initialStock }: { slug: string; initialStock: number }) {
  const [value, setValue] = useState(initialStock);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const commit = (next: number) => {
    const safe = Number.isFinite(next) ? Math.max(0, Math.round(next)) : value;
    setValue(safe);
    setError(null);
    startTransition(async () => {
      const result = await updateStockAction(slug, safe);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex items-center border border-mist">
        <button
          type="button"
          aria-label="Diminuir estoque"
          onClick={() => commit(value - 1)}
          disabled={pending || value <= 0}
          className="h-8 w-8 text-graphite transition-colors hover:text-petrol disabled:cursor-not-allowed disabled:opacity-40"
        >
          −
        </button>
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          onBlur={(e) => commit(Number(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className="w-14 border-x border-mist bg-transparent px-1 py-1.5 text-center text-sm outline-none"
        />
        <button
          type="button"
          aria-label="Aumentar estoque"
          onClick={() => commit(value + 1)}
          disabled={pending}
          className="h-8 w-8 text-graphite transition-colors hover:text-petrol disabled:cursor-not-allowed disabled:opacity-40"
        >
          +
        </button>
      </div>
      {pending && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="animate-spin text-graphite">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )}
      {!pending && saved && <span className="text-[11px] text-petrol">Salvo ✓</span>}
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  );
}
