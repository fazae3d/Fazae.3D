"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveAutomationAction } from "@/app/admin/conversas/ajustes/actions";
import { useToast } from "@/components/admin/toast";
import type { WaAutomationSettings } from "@/server/repositories/wa-settings-repository";

const AREA = "w-full rounded-lg border border-mist bg-transparent px-2.5 py-2 text-sm outline-none focus:border-petrol";

function Toggle({ checked, onChange, title, hint }: { checked: boolean; onChange: (v: boolean) => void; title: string; hint?: string }) {
  return (
    <label className="flex items-start gap-2">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 accent-[#b6ff00]" />
      <span>
        <span className="text-sm font-medium">{title}</span>
        {hint ? <span className="block text-xs text-graphite">{hint}</span> : null}
      </span>
    </label>
  );
}

/** Respostas automáticas (fora do horário e boas-vindas) e avisos de pedido por WhatsApp. */
export function WhatsAppAutomationForm({ initial, hours }: { initial: WaAutomationSettings; hours: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [s, setS] = useState<WaAutomationSettings>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<WaAutomationSettings>) => setS((cur) => ({ ...cur, ...patch }));
  const dirty = JSON.stringify(s) !== JSON.stringify(initial);

  const save = async () => {
    setPending(true);
    setError(null);
    const result = await saveAutomationAction(s);
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    toast("Ajustes salvos");
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <div className="admin-card rounded-xl border border-mist p-5">
        <p className="font-medium">Respostas automáticas ao cliente</p>
        <p className="mt-1 text-sm text-graphite">
          Quando alguém escreve para a loja. Horário de atendimento: <strong className="text-ink">{hours}</strong> (o mesmo do envio das cadências, ajustável em Cadências). No máximo uma resposta automática a cada 12 horas por contato, e nunca se você já respondeu há pouco.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <Toggle checked={s.awayEnabled} onChange={(v) => set({ awayEnabled: v })} title="Avisar quando escreverem fora do horário" hint="Quem escreve de noite, domingo ou de madrugada recebe esta mensagem." />
            {s.awayEnabled ? <textarea value={s.awayText} onChange={(e) => set({ awayText: e.target.value })} rows={3} className={`${AREA} mt-2`} /> : null}
          </div>
          <div>
            <Toggle checked={s.greetingEnabled} onChange={(v) => set({ greetingEnabled: v })} title="Dar boas-vindas a quem chama pela primeira vez" hint="Só no horário de atendimento e só para contato novo que chamou primeiro." />
            {s.greetingEnabled ? <textarea value={s.greetingText} onChange={(e) => set({ greetingText: e.target.value })} rows={3} className={`${AREA} mt-2`} /> : null}
          </div>
          <p className="text-xs text-graphite">
            <code className="rounded bg-mist px-1">{"{{nome}}"}</code> vira o primeiro nome do contato.
          </p>
        </div>
      </div>

      <div className="admin-card rounded-xl border border-mist p-5">
        <Toggle
          checked={s.orderNotifyEnabled}
          onChange={(v) => set({ orderNotifyEnabled: v })}
          title="Avisar o cliente do pedido por WhatsApp"
          hint="Pagamento aprovado, pedido enviado (com rastreio) e Pix perto de vencer, só para pedidos feitos no site com celular válido. Cada aviso sai uma única vez por pedido."
        />
        {s.orderNotifyEnabled ? (
          <div className="mt-4 space-y-4">
            {(
              [
                ["pago", "Pagamento aprovado"],
                ["enviado", "Pedido enviado"],
                ["pix", "Pix perto de vencer (o código copia-e-cola vai em outra mensagem)"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-xs text-graphite">
                {label}
                <textarea value={s.orderTemplates[key]} onChange={(e) => set({ orderTemplates: { ...s.orderTemplates, [key]: e.target.value } })} rows={3} className={`${AREA} mt-1`} />
              </label>
            ))}
            <p className="text-xs text-graphite">
              Variáveis: <code className="rounded bg-mist px-1">{"{{nome}}"}</code> <code className="rounded bg-mist px-1">{"{{pedido}}"}</code> <code className="rounded bg-mist px-1">{"{{total}}"}</code> <code className="rounded bg-mist px-1">{"{{rastreio}}"}</code>. A primeira mensagem para um número novo leva o aviso “responda SAIR”. Quem pedir para sair não recebe mais nada. Quando o Pix é avisado por WhatsApp, o e-mail de lembrete não repete.
            </p>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      <button type="button" onClick={save} disabled={pending || !dirty} className="rounded-lg bg-petrol px-5 py-2.5 text-sm font-semibold text-[#111] disabled:opacity-50">
        {pending ? "Salvando…" : "Salvar ajustes"}
      </button>
    </div>
  );
}
