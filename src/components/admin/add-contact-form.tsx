"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/admin/toast";
import { addContactAction } from "@/app/admin/clientes/campanhas/actions";

/** Cadastro manual: só para quem pediu para receber novidades (pessoalmente ou por WhatsApp). Exige confirmar a autorização. */
export function AddContactForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-mist px-3.5 py-2 text-sm transition-colors hover:border-petrol">
        Adicionar contato
      </button>
    );
  }

  const submit = async () => {
    setError(null);
    setSaving(true);
    const res = await addContactAction({ email, name, consent });
    setSaving(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    toast("Contato adicionado");
    setEmail("");
    setName("");
    setConsent(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <div className="admin-card mb-6 w-full rounded-xl border border-mist p-4">
      <p className="mb-3 text-sm font-semibold">Adicionar contato</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail *" inputMode="email" className="rounded-lg border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome (opcional)" className="rounded-lg border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol" />
      </div>
      <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs text-graphite">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-ink" />
        Confirmo que essa pessoa pediu para receber novidades e ofertas da Fazaê.
      </label>
      {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={submit} disabled={saving} className="rounded-lg bg-petrol px-4 py-2 text-sm font-semibold disabled:opacity-60">
          {saving ? "Salvando…" : "Adicionar"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-sm text-graphite hover:text-ink">
          Cancelar
        </button>
      </div>
    </div>
  );
}
