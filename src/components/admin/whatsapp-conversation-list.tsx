"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { bulkConversationsAction } from "@/app/admin/conversas/actions";
import { Select } from "@/components/select";
import { useToast } from "@/components/admin/toast";
import { LEAD_STAGES, formatPhone, sourceLabel, stageLabel } from "@/lib/whatsapp";
import type { WaConversationView } from "@/server/repositories/whatsapp-repository";

const STORE_TZ = "America/Fortaleza";
const SELECT_CLASS = "rounded-lg border border-mist bg-transparent px-2.5 py-2 text-xs focus:border-petrol";

function listTime(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const day = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: STORE_TZ });
  return day(date) === day(new Date())
    ? date.toLocaleTimeString("pt-BR", { timeZone: STORE_TZ, hour: "2-digit", minute: "2-digit" })
    : day(date).slice(0, 5);
}

/** "5 min", "3 h", "2 dias": há quanto tempo o cliente espera. */
function waitingFor(iso: string, now: number) {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.round(hours / 24);
  return `${days} dia${days > 1 ? "s" : ""}`;
}

function href(params: { c?: string; f?: string; etapa?: string; q?: string }) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) qs.set(key, value);
  const text = qs.toString();
  return `/admin/conversas${text ? `?${text}` : ""}`;
}

/** Lista de conversas com o tempo de espera de quem aguarda resposta e seleção em lote (etapa, etiqueta, cadência). */
export function WhatsAppConversationList({
  conversations,
  selectedId,
  params,
  cadences,
}: {
  conversations: WaConversationView[];
  selectedId: string | null;
  params: { f?: string; etapa?: string; q?: string };
  cadences: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [now, setNow] = useState<number | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [stage, setStage] = useState("");
  const [tag, setTag] = useState("");
  const [cadenceId, setCadenceId] = useState("");
  const [pending, setPending] = useState(false);

  // O "há quanto tempo" só aparece depois de carregar no navegador (o servidor e o navegador mostrariam minutos diferentes).
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const toggle = (id: string) => setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  const exit = () => {
    setSelecting(false);
    setPicked([]);
  };

  const run = async (change: Parameters<typeof bulkConversationsAction>[1], okMessage: string) => {
    setPending(true);
    const result = await bulkConversationsAction(picked, change);
    setPending(false);
    if (!result.success) {
      toast(result.error, "error");
      return;
    }
    toast(`${okMessage} (${result.affected})`);
    router.refresh();
  };

  return (
    <>
      <div className="flex items-center justify-between text-xs text-graphite">
        <span>{conversations.length} conversa(s)</span>
        <button type="button" onClick={() => (selecting ? exit() : setSelecting(true))} className="hover:text-ink hover:underline">
          {selecting ? "Cancelar seleção" : "Selecionar várias"}
        </button>
      </div>

      {selecting ? (
        <div className="space-y-2 rounded-lg border border-petrol/40 bg-petrol/5 p-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setPicked(picked.length === conversations.length ? [] : conversations.map((c) => c.id))} className="text-petrol hover:underline">
              {picked.length === conversations.length ? "Desmarcar todas" : `Marcar todas (${conversations.length})`}
            </button>
            <span className="text-graphite">{picked.length} marcada(s)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <Select value={stage} onChange={setStage} placeholder="Mudar etapa para…" options={LEAD_STAGES.map((s) => ({ value: s.key, label: s.label }))} className={SELECT_CLASS} />
            </div>
            <button type="button" disabled={!picked.length || !stage || pending} onClick={() => run({ stage }, "Etapa alterada")} className="rounded-lg border border-mist px-3 py-2 hover:border-petrol disabled:opacity-40">
              Aplicar
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Acrescentar etiqueta" className="min-w-0 flex-1 rounded-lg border border-mist bg-transparent px-2.5 py-2 outline-none focus:border-petrol" />
            <button type="button" disabled={!picked.length || !tag.trim() || pending} onClick={() => run({ addTag: tag }, "Etiqueta acrescentada")} className="rounded-lg border border-mist px-3 py-2 hover:border-petrol disabled:opacity-40">
              Etiquetar
            </button>
          </div>
          {cadences.length > 0 ? (
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <Select value={cadenceId} onChange={setCadenceId} placeholder="Colocar em uma cadência…" options={cadences.map((c) => ({ value: c.id, label: c.name }))} className={SELECT_CLASS} />
              </div>
              <button type="button" disabled={!picked.length || !cadenceId || pending} onClick={() => run({ enrollCadenceId: cadenceId }, "Colocados na cadência")} className="rounded-lg border border-mist px-3 py-2 hover:border-petrol disabled:opacity-40">
                Colocar
              </button>
            </div>
          ) : null}
          <button type="button" disabled={!picked.length || pending} onClick={() => run({ stopCadences: true }, "Cadências paradas")} className="text-graphite hover:text-red-400 hover:underline disabled:opacity-40">
            Parar as cadências das marcadas
          </button>
        </div>
      ) : null}

      <div className="admin-card min-h-0 flex-1 divide-y divide-mist overflow-y-auto rounded-xl border border-mist">
        {conversations.length === 0 ? (
          <p className="p-6 text-center text-sm text-graphite">
            {params.q || params.f || params.etapa ? "Nenhuma conversa com esse filtro." : "Nenhuma conversa ainda. Use “Nova conversa” ou espere o primeiro contato chegar."}
          </p>
        ) : (
          conversations.map((cv) => {
            const waiting = cv.lastDirection === "in" && !cv.optedOut && cv.lastInboundAt && now !== null ? waitingFor(cv.lastInboundAt, now) : null;
            const waitingLong = waiting !== null && cv.lastInboundAt && now !== null && now - new Date(cv.lastInboundAt).getTime() > 60 * 60_000;
            const dueToday = cv.nextActionAt && now !== null ? new Date(cv.nextActionAt).getTime() <= now + 12 * 3_600_000 : false;
            const body = (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <p className={`truncate text-sm ${cv.unreadCount > 0 ? "font-semibold" : "font-medium"}`}>{cv.name ?? formatPhone(cv.phone)}</p>
                  <span className="shrink-0 text-[11px] text-graphite">{listTime(cv.lastMessageAt)}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-graphite">{cv.lastPreview ?? "Sem mensagens"}</p>
                  {cv.unreadCount > 0 ? <span className="shrink-0 rounded-full bg-petrol px-1.5 text-[11px] font-semibold leading-4 text-[#111]">{cv.unreadCount}</span> : null}
                </div>
                <p className="mt-1 text-[11px] text-graphite">
                  {stageLabel(cv.stage)} · {sourceLabel(cv.source)}
                  {cv.optedOut ? " · não quer receber" : ""}
                  {waiting ? <span className={waitingLong ? " font-medium text-amber-500" : ""}> · aguardando você há {waiting}</span> : null}
                  {dueToday ? <span className="font-medium text-petrol"> · {cv.nextActionNote ?? "ação combinada"}</span> : null}
                </p>
              </>
            );
            return selecting ? (
              <label key={cv.id} className={`flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-mist/50 ${picked.includes(cv.id) ? "bg-petrol/10" : ""}`}>
                <input type="checkbox" checked={picked.includes(cv.id)} onChange={() => toggle(cv.id)} className="mt-1 h-4 w-4 accent-[#b6ff00]" />
                <div className="min-w-0 flex-1">{body}</div>
              </label>
            ) : (
              <Link key={cv.id} href={href({ c: cv.id, ...params })} className={`block px-4 py-3 transition-colors hover:bg-mist/50 ${selectedId === cv.id ? "bg-mist/60" : ""}`}>
                {body}
              </Link>
            );
          })
        )}
      </div>
    </>
  );
}
