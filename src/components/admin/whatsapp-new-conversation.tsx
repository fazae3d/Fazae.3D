"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startConversationAction } from "@/app/admin/conversas/actions";
import { Select } from "@/components/select";
import { CONVERSATION_SOURCES } from "@/lib/whatsapp";

const field = "w-full rounded-lg border border-mist bg-transparent px-2.5 py-2 text-sm outline-none focus:border-petrol";

export function WhatsAppNewConversation() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [source, setSource] = useState("prospeccao");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setPending(true);
    setError(null);
    const result = await startConversationAction({ phone, name, source, firstMessage: message });
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setOpen(false);
    setPhone("");
    setName("");
    setMessage("");
    router.push(`/admin/conversas?c=${result.id}`);
    router.refresh();
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="w-full rounded-lg bg-petrol px-3 py-2 text-sm font-semibold text-[#111]">
        + Nova conversa
      </button>
    );
  }
  return (
    <div className="space-y-2 rounded-lg border border-mist p-3">
      <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="Telefone com DDD" className={field} />
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome (opcional)" className={field} />
      <Select value={source} onChange={setSource} options={CONVERSATION_SOURCES.map((s) => ({ value: s.key, label: s.label }))} className="rounded-lg border border-mist bg-transparent px-2.5 py-2 text-sm focus:border-petrol" />
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Primeira mensagem (opcional)" className={field} />
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
      <div className="flex items-center gap-3">
        <button type="button" onClick={submit} disabled={pending || !phone.trim()} className="rounded-lg bg-petrol px-4 py-2 text-sm font-semibold text-[#111] disabled:opacity-50">
          {pending ? "Abrindo…" : message.trim() ? "Enviar" : "Abrir conversa"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-graphite hover:text-ink">
          Cancelar
        </button>
      </div>
    </div>
  );
}
