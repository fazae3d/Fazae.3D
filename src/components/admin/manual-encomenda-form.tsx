"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/select";
import { useToast } from "@/components/admin/toast";
import { createManualEncomendaAction } from "@/app/admin/encomendas/actions";
import { formatPrice } from "@/lib/format";
import { round2 } from "@/lib/money";

const INPUT = "w-full rounded-lg border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol";
const LABEL = "mb-1.5 block text-xs font-medium text-graphite";

/** "1.234,50" / "12,5" / "12.5" → número; vazio ou inválido → 0. */
function parseMoney(value: string) {
  const text = value.trim();
  if (!text) return 0;
  const n = Number(text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text);
  return Number.isFinite(n) ? n : 0;
}

const EMPTY = { name: "", phone: "", email: "", description: "", quantity: "1", unitPrice: "", deposit: "", deadline: "", paymentMethod: "pix" };

export function ManualEncomendaForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<typeof EMPTY>) => setForm((prev) => ({ ...prev, ...patch }));
  const quantity = Math.floor(Number(form.quantity)) || 0;
  const total = round2(quantity * parseMoney(form.unitPrice));
  const deposit = parseMoney(form.deposit);

  const submit = async () => {
    setError(null);
    setSaving(true);
    const result = await createManualEncomendaAction({
      name: form.name,
      phone: form.phone,
      email: form.email,
      description: form.description,
      quantity,
      unitPrice: parseMoney(form.unitPrice),
      deposit,
      deadline: form.deadline,
      paymentMethod: form.paymentMethod as "pix" | "cartao" | "boleto",
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      toast(result.error, "error");
      return;
    }
    toast("Encomenda cadastrada e venda lançada na produção");
    setForm(EMPTY);
    setOpen(false);
    router.refresh();
  };

  if (!open) {
    return (
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg bg-petrol px-3.5 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
        >
          Nova encomenda manual
        </button>
      </div>
    );
  }

  return (
    <section className="admin-card mb-6 rounded-xl border border-mist p-5 sm:p-6">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold">Nova encomenda manual</h2>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-graphite hover:text-ink">
          Cancelar
        </button>
      </div>
      <p className="mb-5 text-xs text-graphite">
        Para cliente que fechou pelo WhatsApp ou pessoalmente. Ao salvar, a encomenda entra aqui como fechada e a venda já é lançada na
        fila de produção, com prazo e sinal.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={LABEL}>Nome do cliente *</label>
          <input className={INPUT} value={form.name} onChange={(e) => set({ name: e.target.value })} />
        </div>
        <div>
          <label className={LABEL}>WhatsApp *</label>
          <input className={INPUT} value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="(84) 99999-9999" inputMode="tel" />
        </div>
        <div>
          <label className={LABEL}>E-mail (opcional)</label>
          <input className={INPUT} value={form.email} onChange={(e) => set({ email: e.target.value })} inputMode="email" />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={LABEL}>O que será produzido *</label>
          <input
            className={INPUT}
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="Ex.: 40 chaveiros com nome, PLA preto e lima"
          />
        </div>
        <div>
          <label className={LABEL}>Quantidade</label>
          <input className={INPUT} type="number" min={1} value={form.quantity} onChange={(e) => set({ quantity: e.target.value })} />
        </div>
        <div>
          <label className={LABEL}>Valor unitário (R$) *</label>
          <input className={INPUT} value={form.unitPrice} onChange={(e) => set({ unitPrice: e.target.value })} placeholder="0,00" inputMode="decimal" />
        </div>
        <div>
          <label className={LABEL}>Prazo de entrega</label>
          <input className={INPUT} type="date" value={form.deadline} onChange={(e) => set({ deadline: e.target.value })} />
        </div>
        <div>
          <label className={LABEL}>Sinal recebido (R$)</label>
          <input className={INPUT} value={form.deposit} onChange={(e) => set({ deposit: e.target.value })} placeholder="0,00" inputMode="decimal" />
        </div>
        <div>
          <label className={LABEL}>Forma de pagamento</label>
          <Select
            value={form.paymentMethod}
            onChange={(v) => set({ paymentMethod: v })}
            options={[
              { value: "pix", label: "Pix" },
              { value: "cartao", label: "Cartão" },
              { value: "boleto", label: "Boleto" },
            ]}
            className="rounded-lg border border-mist bg-transparent px-3 py-2 text-sm focus:border-petrol"
          />
        </div>
        <div className="flex flex-col justify-end">
          <span className="text-xs text-graphite">Total da venda</span>
          <span className="text-lg font-semibold">{formatPrice(total)}</span>
          {total > 0 ? <span className="text-xs text-graphite">Falta receber {formatPrice(Math.max(0, round2(total - deposit)))}</span> : null}
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-500">{error}</p> : null}

      <button
        type="button"
        onClick={submit}
        disabled={saving}
        className="mt-5 rounded-lg bg-petrol px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "Salvando…" : "Cadastrar e lançar venda"}
      </button>
    </section>
  );
}
