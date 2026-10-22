"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { applyAudienceAction, previewAudienceAction } from "@/app/admin/conversas/cadencias/actions";
import { Select } from "@/components/select";
import { useToast } from "@/components/admin/toast";
import { DAY_LABELS, DEFAULT_SEND_DAYS, type CadenceAudience, type CadenceSchedule } from "@/lib/wa-cadence";
import { CONVERSATION_SOURCES, LEAD_STAGES } from "@/lib/whatsapp";

export type RulesState = {
  sendDays: number[];
  customWindow: boolean;
  start: string;
  end: string;
  autoEnroll: boolean;
  useConversations: boolean;
  sources: string[];
  stages: string[];
  tag: string;
  silentDays: string;
  useInactive: boolean;
  inactiveDays: string;
  useDelivered: boolean;
  deliveredDays: string;
  repeat: boolean;
  repeatDays: string;
};

type Defaults = { windowStartHour: number; windowEndHour: number };

export function initialRules(
  initial: { schedule: CadenceSchedule; autoEnroll: boolean; audience: CadenceAudience; repeatAfterDays: number | null },
  defaults: Defaults,
): RulesState {
  const c = initial.audience.conversations;
  return {
    sendDays: initial.schedule.sendDays.length ? initial.schedule.sendDays : DEFAULT_SEND_DAYS,
    customWindow: initial.schedule.windowStartHour !== null && initial.schedule.windowEndHour !== null,
    start: String(initial.schedule.windowStartHour ?? defaults.windowStartHour),
    end: String(initial.schedule.windowEndHour ?? defaults.windowEndHour),
    autoEnroll: initial.autoEnroll,
    useConversations: Boolean(c),
    sources: c?.sources ?? [],
    stages: c?.stages ?? [],
    tag: c?.tag ?? "",
    silentDays: c?.silentDays ? String(c.silentDays) : "",
    useInactive: initial.audience.inactiveCustomersDays !== undefined,
    inactiveDays: String(initial.audience.inactiveCustomersDays ?? 120),
    useDelivered: initial.audience.deliveredOrdersDays !== undefined,
    deliveredDays: String(initial.audience.deliveredOrdersDays ?? 3),
    repeat: initial.repeatAfterDays !== null,
    repeatDays: String(initial.repeatAfterDays ?? 30),
  };
}

const toInt = (value: string) => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

export function rulesToAudience(rules: RulesState): CadenceAudience {
  return {
    ...(rules.useConversations
      ? { conversations: { sources: rules.sources, stages: rules.stages, ...(rules.tag.trim() ? { tag: rules.tag.trim().toLowerCase() } : {}), ...(toInt(rules.silentDays) ? { silentDays: toInt(rules.silentDays) } : {}) } }
      : {}),
    ...(rules.useInactive && toInt(rules.inactiveDays) ? { inactiveCustomersDays: toInt(rules.inactiveDays) } : {}),
    ...(rules.useDelivered && toInt(rules.deliveredDays) ? { deliveredOrdersDays: toInt(rules.deliveredDays) } : {}),
  };
}

/** O que vai para a ação de salvar (dias, horário próprio, entrada automática, público e repetição). */
export function rulesToPayload(rules: RulesState) {
  return {
    sendDays: rules.sendDays,
    windowStartHour: rules.customWindow ? Number(rules.start) : null,
    windowEndHour: rules.customWindow ? Number(rules.end) : null,
    autoEnroll: rules.autoEnroll,
    audience: rulesToAudience(rules),
    repeatAfterDays: rules.repeat ? (toInt(rules.repeatDays) ?? null) : null,
  };
}

const SELECT_CLASS = "rounded-lg border border-mist bg-transparent px-2.5 py-2 text-sm focus:border-petrol";
const FIELD = "rounded-lg border border-mist bg-transparent px-2.5 py-2 text-sm outline-none focus:border-petrol";
const HOURS = Array.from({ length: 25 }, (_, h) => ({ value: String(h), label: `${String(h).padStart(2, "0")}h` }));

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${active ? "border-petrol bg-petrol/15 text-ink" : "border-mist text-graphite hover:border-petrol"}`}
    >
      {children}
    </button>
  );
}

const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

/** As regras da cadência: quando envia, para quem entra sozinho e se repete. */
export function WhatsAppCadenceRules({
  id,
  rules,
  onChange,
  defaults,
  dirty,
}: {
  id: string | null;
  rules: RulesState;
  onChange: (next: RulesState) => void;
  defaults: Defaults;
  dirty: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [preview, setPreview] = useState<{ count: number; sample: string[]; restarting: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmApply, setConfirmApply] = useState(false);
  const set = (patch: Partial<RulesState>) => {
    setPreview(null);
    onChange({ ...rules, ...patch });
  };
  const audience = rulesToAudience(rules);
  const hasAudience = Boolean(audience.conversations) || audience.inactiveCustomersDays !== undefined || audience.deliveredOrdersDays !== undefined;

  const check = async () => {
    setBusy(true);
    const result = await previewAudienceAction({ id, audience, repeatAfterDays: rules.repeat ? (toInt(rules.repeatDays) ?? null) : null });
    setBusy(false);
    if (!result.success) {
      toast(result.error, "error");
      return;
    }
    setPreview(result);
  };

  const apply = async () => {
    if (!id) return;
    setBusy(true);
    const result = await applyAudienceAction(id);
    setBusy(false);
    setConfirmApply(false);
    if (!result.success) {
      toast(result.error, "error");
      return;
    }
    setPreview(null);
    toast(result.enrolled ? `${result.enrolled} contato(s) colocados na cadência` : "Ninguém novo para colocar agora");
    router.refresh();
  };

  return (
    <div className="space-y-5">
      {/* Quando */}
      <div className="admin-card rounded-xl border border-mist p-5">
        <p className="font-medium">Quando enviar</p>
        <p className="mt-1 text-sm text-graphite">Dias da semana e horário em que esta cadência pode mandar mensagens.</p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Dias da semana">
          {DAY_LABELS.map((label, day) => (
            <Chip key={day} active={rules.sendDays.includes(day)} onClick={() => set({ sendDays: toggle(rules.sendDays, day).sort() })}>
              {label}
            </Chip>
          ))}
        </div>
        {rules.sendDays.length === 0 ? <p className="mt-2 text-xs text-amber-500">Nenhum dia marcado: vale segunda a sábado.</p> : null}
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={rules.customWindow} onChange={(e) => set({ customWindow: e.target.checked })} className="h-4 w-4 accent-[#b6ff00]" />
          Usar um horário só desta cadência (senão vale o geral: {defaults.windowStartHour}h às {defaults.windowEndHour}h)
        </label>
        {rules.customWindow ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="text-graphite">Das</span>
            <div className="w-24">
              <Select value={rules.start} onChange={(v) => set({ start: v })} options={HOURS.slice(0, 24)} className={SELECT_CLASS} />
            </div>
            <span className="text-graphite">às</span>
            <div className="w-24">
              <Select value={rules.end} onChange={(v) => set({ end: v })} options={HOURS.slice(1)} className={SELECT_CLASS} />
            </div>
            {Number(rules.start) >= Number(rules.end) ? <span className="text-xs text-red-500">o início precisa ser antes do fim</span> : null}
          </div>
        ) : null}
      </div>

      {/* Para quem */}
      <div className="admin-card rounded-xl border border-mist p-5">
        <label className="flex items-start gap-2">
          <input type="checkbox" checked={rules.autoEnroll} onChange={(e) => set({ autoEnroll: e.target.checked })} className="mt-1 h-4 w-4 accent-[#b6ff00]" />
          <span>
            <span className="font-medium">Colocar contatos nesta cadência automaticamente</span>
            <span className="block text-sm text-graphite">Sem isso, só entra quem você colocar à mão ou importar numa lista. Com isso, quem combinar com as regras abaixo entra sozinho (até 100 por vez).</span>
          </span>
        </label>

        <div className={`mt-4 space-y-4 ${rules.autoEnroll ? "" : "opacity-60"}`}>
          <div className="rounded-lg border border-mist p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={rules.useConversations} onChange={(e) => set({ useConversations: e.target.checked })} className="h-4 w-4 accent-[#b6ff00]" />
              Contatos que já estão em Conversas
            </label>
            {rules.useConversations ? (
              <div className="mt-3 space-y-3 text-sm">
                <div>
                  <p className="mb-1.5 text-xs text-graphite">Etapa do funil (nenhuma marcada = qualquer)</p>
                  <div className="flex flex-wrap gap-2">
                    {LEAD_STAGES.map((s) => (
                      <Chip key={s.key} active={rules.stages.includes(s.key)} onClick={() => set({ stages: toggle(rules.stages, s.key) })}>
                        {s.label}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-xs text-graphite">Origem (nenhuma marcada = qualquer)</p>
                  <div className="flex flex-wrap gap-2">
                    {CONVERSATION_SOURCES.map((s) => (
                      <Chip key={s.key} active={rules.sources.includes(s.key)} onClick={() => set({ sources: toggle(rules.sources, s.key) })}>
                        {s.label}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs text-graphite">Com a etiqueta (opcional)</span>
                    <input value={rules.tag} onChange={(e) => set({ tag: e.target.value })} placeholder="Ex.: lista-novembro" className={`${FIELD} w-full`} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs text-graphite">Sem nenhuma mensagem há (dias, opcional)</span>
                    <input value={rules.silentDays} onChange={(e) => set({ silentDays: e.target.value.replace(/\D/g, "") })} inputMode="numeric" placeholder="Ex.: 7" className={`${FIELD} w-full`} />
                  </label>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-mist p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={rules.useInactive} onChange={(e) => set({ useInactive: e.target.checked })} className="h-4 w-4 accent-[#b6ff00]" />
              Clientes cadastrados que não compram há
              <input
                value={rules.inactiveDays}
                onChange={(e) => set({ inactiveDays: e.target.value.replace(/\D/g, ""), useInactive: true })}
                inputMode="numeric"
                className={`${FIELD} w-20 py-1`}
                aria-label="Dias sem comprar"
              />
              dias
            </label>
            <p className="mt-1 pl-6 text-xs text-graphite">Só quem já comprou e tem telefone válido. Quem foi lembrado nos últimos 30 dias fica de fora.</p>
          </div>

          <div className="rounded-lg border border-mist p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={rules.useDelivered} onChange={(e) => set({ useDelivered: e.target.checked })} className="h-4 w-4 accent-[#b6ff00]" />
              Clientes cujo pedido foi entregue há
              <input
                value={rules.deliveredDays}
                onChange={(e) => set({ deliveredDays: e.target.value.replace(/\D/g, ""), useDelivered: true })}
                inputMode="numeric"
                className={`${FIELD} w-20 py-1`}
                aria-label="Dias desde a entrega"
              />
              dias
            </label>
            <p className="mt-1 pl-6 text-xs text-graphite">Gatilho de pós-venda: vale para pedidos marcados como “Entregue” de agora em diante (só os últimos 14 dias a partir desse prazo, nunca pedidos antigos).</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={check} disabled={busy || !hasAudience} className="rounded-lg border border-mist px-4 py-2 text-sm hover:border-petrol disabled:opacity-50">
            {busy ? "Conferindo…" : "Ver quem entraria agora"}
          </button>
          {id && hasAudience ? (
            confirmApply ? (
              <span className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-graphite">Colocar agora quem combina (até 100)?</span>
                <button type="button" onClick={apply} disabled={busy} className="rounded-lg bg-petrol px-3 py-1.5 font-semibold text-[#111] disabled:opacity-60">
                  Sim, colocar
                </button>
                <button type="button" onClick={() => setConfirmApply(false)} className="text-graphite hover:text-ink">
                  Não
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmApply(true)} disabled={busy || dirty} title={dirty ? "Salve a cadência antes" : undefined} className="rounded-lg border border-mist px-4 py-2 text-sm hover:border-petrol disabled:opacity-50">
                Colocar agora
              </button>
            )
          ) : null}
          {dirty && id ? <span className="text-xs text-graphite">Salve a cadência para poder colocar agora.</span> : null}
        </div>
        {preview ? (
          <div className="mt-3 rounded-lg bg-petrol/10 px-3.5 py-2.5 text-sm">
            <p>
              <strong>{preview.count}</strong> contato(s) entrariam agora{preview.restarting ? ` (${preview.restarting} voltando para repetir)` : ""}.
            </p>
            {preview.sample.length ? <p className="mt-1 text-xs text-graphite">Por exemplo: {preview.sample.join(", ")}{preview.count > preview.sample.length ? "…" : ""}</p> : null}
            <p className="mt-1 text-xs text-graphite">Fica de fora quem pediu para sair e quem já está numa cadência em andamento.</p>
          </div>
        ) : null}
      </div>

      {/* Repetir */}
      <div className="admin-card rounded-xl border border-mist p-5">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={rules.repeat} onChange={(e) => set({ repeat: e.target.checked })} className="h-4 w-4 accent-[#b6ff00]" />
          Repetir a cadência
        </label>
        {rules.repeat ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-graphite">Quem terminou e não respondeu pode entrar de novo depois de</span>
            <input value={rules.repeatDays} onChange={(e) => set({ repeatDays: e.target.value.replace(/\D/g, "") })} inputMode="numeric" className={`${FIELD} w-20 py-1.5`} aria-label="Dias para repetir" />
            <span className="text-graphite">dias</span>
          </div>
        ) : (
          <p className="mt-1 pl-6 text-xs text-graphite">Desmarcado: cada contato passa por esta cadência uma única vez.</p>
        )}
        {rules.repeat ? <p className="mt-2 text-xs text-graphite">Só repete para quem está elegível pelas regras de “para quem” (com a entrada automática ligada). Quem respondeu, saiu ou foi parado não volta.</p> : null}
      </div>
    </div>
  );
}
