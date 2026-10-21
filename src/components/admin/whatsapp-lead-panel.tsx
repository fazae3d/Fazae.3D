"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setOptOutAction, simulateInboundAction, updateLeadAction } from "@/app/admin/conversas/actions";
import { useToast } from "@/components/admin/toast";
import { formatPrice } from "@/lib/format";
import { CONVERSATION_SOURCES, LEAD_STAGES } from "@/lib/whatsapp";
import type { WaConversationView } from "@/server/repositories/whatsapp-repository";

export type LinkedCustomer = { id: string; name: string; orderCount: number; totalSpent: number } | null;

const field = "w-full rounded-lg border border-mist bg-transparent px-2.5 py-2 text-sm outline-none focus:border-petrol";

export function WhatsAppLeadPanel({ conversation, customer, simulated }: { conversation: WaConversationView; customer: LinkedCustomer; simulated: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(conversation.name ?? "");
  const [stage, setStage] = useState(conversation.stage);
  const [source, setSource] = useState(conversation.source);
  const [tags, setTags] = useState(conversation.tags.join(", "));
  const [notes, setNotes] = useState(conversation.notes ?? "");
  const [pending, setPending] = useState(false);
  const [simText, setSimText] = useState("");

  const dirty =
    name !== (conversation.name ?? "") ||
    stage !== conversation.stage ||
    source !== conversation.source ||
    tags !== conversation.tags.join(", ") ||
    notes !== (conversation.notes ?? "");

  const save = async () => {
    setPending(true);
    const result = await updateLeadAction(conversation.id, { name, stage, source, tagsRaw: tags, notes });
    setPending(false);
    if (!result.success) {
      toast(result.error, "error");
      return;
    }
    toast("Contato atualizado");
    router.refresh();
  };

  const toggleOptOut = async () => {
    const result = await setOptOutAction(conversation.id, !conversation.optedOut);
    if (!result.success) {
      toast(result.error, "error");
      return;
    }
    toast(conversation.optedOut ? "Contato reativado" : "Contato marcado como 'não quer receber'");
    router.refresh();
  };

  const simulate = async () => {
    const result = await simulateInboundAction(conversation.id, simText);
    if (!result.success) {
      toast(result.error, "error");
      return;
    }
    setSimText("");
    router.refresh();
  };

  return (
    <div className="space-y-4 p-4 text-sm">
      <div>
        <label className="mb-1 block text-xs text-graphite">Nome</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do contato" className={field} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-graphite">Etapa</label>
          <select value={stage} onChange={(e) => setStage(e.target.value)} className={field}>
            {LEAD_STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-graphite">Origem</label>
          <select value={source} onChange={(e) => setSource(e.target.value)} className={field}>
            {CONVERSATION_SOURCES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs text-graphite">Etiquetas (separadas por vírgula)</label>
        <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="atacado, personalizado, chaveiro" className={field} />
      </div>
      <div>
        <label className="mb-1 block text-xs text-graphite">Observações</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="O que ele pediu, combinados, próximo passo…" className={field} />
      </div>
      <button type="button" onClick={save} disabled={!dirty || pending} className="w-full rounded-lg bg-petrol px-4 py-2 font-semibold text-[#111] disabled:opacity-40">
        {pending ? "Salvando…" : "Salvar"}
      </button>

      <div className="border-t border-mist pt-4">
        {customer ? (
          <p className="text-xs text-graphite">
            Já é cliente: <strong className="text-ink">{customer.name}</strong> · {customer.orderCount} pedido(s) · {formatPrice(customer.totalSpent)}{" "}
            <Link href={`/admin/clientes/${customer.id}`} className="text-petrol hover:underline">
              ver ficha
            </Link>
          </p>
        ) : (
          <p className="text-xs text-graphite">Esse número ainda não está no cadastro de clientes.</p>
        )}
      </div>

      <div className="border-t border-mist pt-4">
        <button type="button" onClick={toggleOptOut} className={`text-xs hover:underline ${conversation.optedOut ? "text-petrol" : "text-graphite hover:text-red-400"}`}>
          {conversation.optedOut ? "Reativar contato (ele voltou a aceitar mensagens)" : "Marcar como 'não quer receber mensagens'"}
        </button>
        <p className="mt-1 text-xs text-graphite">Quando o contato escreve "sair" ou "parar", isso é marcado sozinho e nenhuma automação escreve mais para ele.</p>
      </div>

      {simulated ? (
        <div className="rounded-lg border border-dashed border-mist p-3">
          <p className="mb-1.5 text-xs font-medium">Modo simulação</p>
          <p className="mb-2 text-xs text-graphite">Finge que o contato respondeu, para testar o painel antes de conectar o WhatsApp.</p>
          <div className="flex gap-2">
            <input value={simText} onChange={(e) => setSimText(e.target.value)} placeholder="Resposta do contato" className={field} />
            <button type="button" onClick={simulate} disabled={!simText.trim()} className="rounded-lg border border-mist px-3 text-xs hover:border-petrol disabled:opacity-40">
              Simular
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
