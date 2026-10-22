"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { runCadencesNowAction, saveWaConfigAction } from "@/app/admin/conversas/cadencias/actions";
import { Select } from "@/components/select";
import { useToast } from "@/components/admin/toast";
import type { SendBudget, WaConfigView } from "@/server/repositories/wa-cadence-repository";

const SELECT_CLASS = "rounded-lg border border-mist bg-transparent px-2.5 py-2 text-sm focus:border-petrol";
const HOURS = Array.from({ length: 25 }, (_, h) => ({ value: String(h), label: `${String(h).padStart(2, "0")}h` }));

/** Liga/desliga o envio automático e define o limite diário e a janela de horário. Nasce desligado. */
export function WhatsAppAutoSendPanel({ config, budget, simulated }: { config: WaConfigView; budget: SendBudget; simulated: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [limit, setLimit] = useState(String(config.dailyLimit));
  const [start, setStart] = useState(String(config.windowStartHour));
  const [end, setEnd] = useState(String(config.windowEndHour));
  const [pending, setPending] = useState(false);
  const [confirmOn, setConfirmOn] = useState(false);

  const dirty = limit !== String(config.dailyLimit) || start !== String(config.windowStartHour) || end !== String(config.windowEndHour);

  const save = async (patch: Parameters<typeof saveWaConfigAction>[0], okMessage: string) => {
    setPending(true);
    const result = await saveWaConfigAction(patch);
    setPending(false);
    setConfirmOn(false);
    if (!result.success) {
      toast(result.error, "error");
      return;
    }
    toast(okMessage);
    router.refresh();
  };

  const runNow = async () => {
    setPending(true);
    const result = await runCadencesNowAction();
    setPending(false);
    if (!result.success) {
      toast(result.error, "error");
      return;
    }
    const r = result.result;
    toast(r.ran ? `Rodada feita: ${r.sent} enviada(s)${r.failed ? `, ${r.failed} falha(s)` : ""}${r.stopped ? `, ${r.stopped} parada(s)` : ""}.` : (r.reason ?? "Nada a fazer agora."), r.ran ? "success" : "error");
    router.refresh();
  };

  return (
    <div className="admin-card mb-6 rounded-xl border border-mist p-5">
      {config.pausedReason ? (
        <div className="mb-4 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2.5 text-sm">
          <strong>Envio pausado automaticamente:</strong> {config.pausedReason}. Confira a conexão do WhatsApp na uazapi e, estando tudo certo, ligue de novo.
        </div>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-xl">
          <p className="font-medium">Envio automático das cadências</p>
          <p className="mt-1 text-sm text-graphite">
            {config.autoSendEnabled
              ? "Ligado: as mensagens saem sozinhas, no ritmo e no horário abaixo."
              : "Desligado: nenhuma mensagem automática sai enquanto isso estiver desligado. Dá para montar tudo com calma antes de ligar."}
          </p>
          {simulated ? <p className="mt-1 text-xs text-amber-500">Modo simulação: as mensagens só ficam registradas, nada vai para o WhatsApp.</p> : null}
        </div>
        {config.autoSendEnabled ? (
          <button type="button" disabled={pending} onClick={() => save({ autoSendEnabled: false }, "Envio automático desligado")} className="rounded-lg border border-red-500/60 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-60">
            Desligar
          </button>
        ) : confirmOn ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-graphite">{simulated ? "Ligar a simulação?" : "Ligar de verdade? As mensagens vão sair do número da loja."}</span>
            <button type="button" disabled={pending} onClick={() => save({ autoSendEnabled: true }, "Envio automático ligado")} className="rounded-lg bg-petrol px-4 py-2 font-semibold text-[#111] disabled:opacity-60">
              Sim, ligar
            </button>
            <button type="button" onClick={() => setConfirmOn(false)} className="text-graphite hover:text-ink">
              Cancelar
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmOn(true)} className="rounded-lg bg-petrol px-4 py-2 text-sm font-semibold text-[#111]">
            Ligar envio automático
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-4 border-t border-mist pt-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs text-graphite">Máximo de mensagens por dia</label>
          <input
            value={limit}
            onChange={(e) => setLimit(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            className="w-full rounded-lg border border-mist bg-transparent px-2.5 py-2 text-sm outline-none focus:border-petrol"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-graphite">Enviar a partir das</label>
          <Select value={start} onChange={setStart} options={HOURS.slice(0, 24)} className={SELECT_CLASS} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-graphite">Parar de enviar às</label>
          <Select value={end} onChange={setEnd} options={HOURS.slice(1)} className={SELECT_CLASS} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!dirty || pending}
          onClick={() => save({ dailyLimit: Number(limit), windowStartHour: Number(start), windowEndHour: Number(end) }, "Regras salvas")}
          className="rounded-lg border border-mist px-4 py-2 text-sm hover:border-petrol disabled:opacity-40"
        >
          Salvar regras
        </button>
        <button type="button" disabled={pending} onClick={runNow} className="rounded-lg border border-mist px-4 py-2 text-sm hover:border-petrol disabled:opacity-60">
          Rodar agora
        </button>
        <p className="text-xs text-graphite">
          Hoje: <strong className="text-ink">{budget.sentToday}</strong> de <strong className="text-ink">{budget.limit}</strong> permitidas
          {budget.limit < config.dailyLimit ? " (o limite sobe aos poucos nos primeiros dias para proteger o número)" : ""}. Envia de segunda a sábado.
        </p>
      </div>
    </div>
  );
}
