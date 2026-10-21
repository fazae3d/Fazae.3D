"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { deleteCadenceAction, saveCadenceAction } from "@/app/admin/conversas/cadencias/actions";
import { Select } from "@/components/select";
import { useToast } from "@/components/admin/toast";
import { CADENCE_KINDS, MAX_STEPS, MAX_STEP_TEXT, renderMessage, type CadenceStep } from "@/lib/wa-cadence";

type Draft = { text: string; amount: string; unit: "h" | "d" };

const SELECT_CLASS = "rounded-lg border border-mist bg-transparent px-2.5 py-2 text-sm focus:border-petrol";
const FIELD = "w-full rounded-lg border border-mist bg-transparent px-2.5 py-2 text-sm outline-none focus:border-petrol";

function toDraft(step: CadenceStep): Draft {
  if (step.delayHours > 0 && step.delayHours % 24 === 0) return { text: step.text, amount: String(step.delayHours / 24), unit: "d" };
  return { text: step.text, amount: String(step.delayHours), unit: "h" };
}

function toHours(draft: Draft) {
  const n = Number(draft.amount.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? (draft.unit === "d" ? n * 24 : n) : NaN;
}

/** Cria/edita uma cadência: nome, tipo e a lista de mensagens com o prazo de cada uma. */
export function WhatsAppCadenceEditor({
  id,
  initial,
}: {
  id: string | null;
  initial: { name: string; kind: string; active: boolean; steps: CadenceStep[] };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(initial.name);
  const [kind, setKind] = useState(initial.kind);
  const [active, setActive] = useState(initial.active);
  const [steps, setSteps] = useState<Draft[]>(initial.steps.map(toDraft));
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const areas = useRef<(HTMLTextAreaElement | null)[]>([]);

  const update = (index: number, patch: Partial<Draft>) => setSteps((list) => list.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  const move = (index: number, dir: -1 | 1) =>
    setSteps((list) => {
      const target = index + dir;
      if (target < 0 || target >= list.length) return list;
      const copy = [...list];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });

  const insert = (index: number, snippet: string) => {
    const area = areas.current[index];
    const current = steps[index].text;
    if (!area) return update(index, { text: current + snippet });
    const from = area.selectionStart ?? current.length;
    const to = area.selectionEnd ?? current.length;
    update(index, { text: current.slice(0, from) + snippet + current.slice(to) });
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(from + snippet.length, from + snippet.length);
    });
  };

  const save = async () => {
    const payload = steps.map((s) => ({ text: s.text, delayHours: toHours(s) }));
    setPending(true);
    const result = await saveCadenceAction(id, { name, kind, active, steps: payload });
    setPending(false);
    if (!result.success) {
      toast(result.error, "error");
      return;
    }
    toast("Cadência salva");
    router.push("/admin/conversas/cadencias");
    router.refresh();
  };

  const remove = async () => {
    if (!id) return;
    setPending(true);
    const result = await deleteCadenceAction(id);
    setPending(false);
    if (!result.success) {
      toast(result.error, "error");
      return;
    }
    toast("Cadência excluída");
    router.push("/admin/conversas/cadencias");
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <div className="admin-card grid gap-4 rounded-xl border border-mist p-5 sm:grid-cols-[1fr_240px]">
        <div>
          <label className="mb-1 block text-xs text-graphite">Nome da cadência</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Prospecção de brindes — 3 contatos" className={FIELD} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-graphite">Tipo</label>
          <Select value={kind} onChange={setKind} options={CADENCE_KINDS.map((k) => ({ value: k.key, label: k.label }))} className={SELECT_CLASS} />
        </div>
        <p className="text-xs text-graphite sm:col-span-2">{CADENCE_KINDS.find((k) => k.key === kind)?.description}</p>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-[#b6ff00]" />
          Cadência ativa (desmarcada, ninguém recebe as mensagens dela)
        </label>
      </div>

      <div className="rounded-xl border border-dashed border-mist p-4 text-sm text-graphite">
        <p className="mb-1 font-medium text-ink">Como escrever</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <code className="rounded bg-mist px-1">{"{{nome}}"}</code> vira o primeiro nome do contato (se não houver nome, ele some sem deixar sobra).
          </li>
          <li>
            <code className="rounded bg-mist px-1">{"{Oi|Olá|E aí}"}</code> sorteia uma das opções a cada envio. Variar o texto reduz o risco de o WhatsApp tratar como spam.
          </li>
          <li>Quando o contato responde, a cadência para sozinha. Quem escreve “sair” ou “parar” nunca mais recebe nada.</li>
        </ul>
      </div>

      {steps.map((step, index) => {
        const hours = toHours(step);
        const preview = renderMessage(step.text, { name: "Maria" }, () => 0);
        return (
          <div key={index} className="admin-card rounded-xl border border-mist p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-medium">Mensagem {index + 1}</p>
              <div className="flex items-center gap-1 text-sm">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="rounded px-2 py-1 text-graphite hover:text-ink disabled:opacity-30" aria-label="Subir">
                  ↑
                </button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === steps.length - 1} className="rounded px-2 py-1 text-graphite hover:text-ink disabled:opacity-30" aria-label="Descer">
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => setSteps((list) => list.filter((_, i) => i !== index))}
                  disabled={steps.length === 1}
                  className="rounded px-2 py-1 text-graphite hover:text-red-400 disabled:opacity-30"
                >
                  Remover
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-graphite">Enviar</span>
              <input
                value={step.amount}
                onChange={(e) => update(index, { amount: e.target.value.replace(/[^\d.,]/g, "") })}
                inputMode="decimal"
                className="w-20 rounded-lg border border-mist bg-transparent px-2.5 py-2 text-sm outline-none focus:border-petrol"
                aria-label="Prazo"
              />
              <div className="w-28">
                <Select
                  value={step.unit}
                  onChange={(v) => update(index, { unit: v as "h" | "d" })}
                  options={[
                    { value: "h", label: "horas" },
                    { value: "d", label: "dias" },
                  ]}
                  className={SELECT_CLASS}
                />
              </div>
              <span className="text-graphite">{index === 0 ? "depois de o contato entrar na cadência" : "depois da mensagem anterior"}</span>
              {Number.isNaN(hours) ? <span className="text-xs text-red-500">prazo inválido</span> : hours === 0 ? <span className="text-xs text-graphite">(na próxima rodada de envio)</span> : null}
            </div>

            <textarea
              ref={(el) => {
                areas.current[index] = el;
              }}
              value={step.text}
              onChange={(e) => update(index, { text: e.target.value })}
              rows={4}
              maxLength={MAX_STEP_TEXT}
              placeholder="Escreva a mensagem"
              className={`${FIELD} mt-3`}
            />
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
              <button type="button" onClick={() => insert(index, "{{nome}}")} className="rounded-full border border-mist px-2.5 py-1 hover:border-petrol">
                + Nome
              </button>
              <button type="button" onClick={() => insert(index, "{Oi|Olá|E aí}")} className="rounded-full border border-mist px-2.5 py-1 hover:border-petrol">
                + Variação de saudação
              </button>
              <span className="text-graphite">
                {step.text.length}/{MAX_STEP_TEXT}
              </span>
            </div>
            {step.text.trim() ? (
              <div className="mt-3 rounded-xl bg-petrol/10 px-3.5 py-2.5 text-sm">
                <p className="mb-1 text-[11px] text-graphite">Prévia (para “Maria”)</p>
                <p className="whitespace-pre-wrap break-words">{preview}</p>
              </div>
            ) : null}
          </div>
        );
      })}

      {steps.length < MAX_STEPS ? (
        <button
          type="button"
          onClick={() => setSteps((list) => [...list, { text: "", amount: "2", unit: "d" }])}
          className="rounded-lg border border-dashed border-mist px-4 py-2.5 text-sm text-graphite hover:border-petrol hover:text-ink"
        >
          + Adicionar mensagem
        </button>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-mist pt-5">
        <button type="button" onClick={save} disabled={pending} className="rounded-lg bg-petrol px-5 py-2.5 text-sm font-semibold text-[#111] disabled:opacity-60">
          {pending ? "Salvando…" : "Salvar cadência"}
        </button>
        <button type="button" onClick={() => router.push("/admin/conversas/cadencias")} className="text-sm text-graphite hover:text-ink">
          Cancelar
        </button>
        {id ? (
          confirmDelete ? (
            <span className="ml-auto flex items-center gap-3 text-sm">
              <span className="text-graphite">Excluir de vez (some também quem está nela)?</span>
              <button type="button" onClick={remove} disabled={pending} className="rounded-lg border border-red-500/60 px-3 py-1.5 text-red-400 hover:bg-red-500/10">
                Sim, excluir
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="text-graphite hover:text-ink">
                Não
              </button>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)} className="ml-auto text-sm text-graphite hover:text-red-400">
              Excluir cadência
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}
