import Link from "next/link";
import { PageHeader, StatusBadge, type BadgeTone } from "@/components/admin/page-header";
import { BulkCancelButton, QueueRowActions, ResumeButton } from "@/components/admin/whatsapp-queue-actions";
import { withReadFallback } from "@/lib/db-fallback";
import { isWithinSendWindow, relativeFromNow } from "@/lib/wa-cadence";
import { formatPhone } from "@/lib/whatsapp";
import { getWhatsAppProvider } from "@/server/whatsapp/provider";
import {
  getQueueStats,
  getSendBudget,
  getWaConfig,
  listCadences,
  listClosed,
  listQueue,
  listSentAutomated,
  type ClosedItem,
  type QueueItem,
  type QueueStats,
  type SentItem,
} from "@/server/repositories/wa-cadence-repository";

export const dynamic = "force-dynamic";

const STORE_TZ = "America/Fortaleza";
type Tab = "fila" | "enviadas" | "encerradas";

function stamp(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR", { timeZone: STORE_TZ, day: "2-digit", month: "2-digit" })} ${d.toLocaleTimeString("pt-BR", { timeZone: STORE_TZ, hour: "2-digit", minute: "2-digit" })}`;
}

function href(params: { aba?: string; cad?: string; q?: string }) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) qs.set(key, value);
  const text = qs.toString();
  return `/admin/conversas/fila${text ? `?${text}` : ""}`;
}

const MESSAGE_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  queued: { label: "Enviando", tone: "neutral" },
  sent: { label: "Enviada", tone: "info" },
  delivered: { label: "Entregue", tone: "info" },
  read: { label: "Lida", tone: "success" },
  failed: { label: "Falhou", tone: "danger" },
};

const EMPTY_STATS: QueueStats = { queued: 0, sentToday: 0, concluded: 0, stopped: 0, replies: 0 };

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="admin-card rounded-xl border border-mist p-4">
      <p className="text-xs text-graphite">{label}</p>
      <p className="font-display mt-1 text-2xl">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-graphite">{hint}</p> : null}
    </div>
  );
}

export default async function FilaPage({ searchParams }: { searchParams: Promise<{ aba?: string; cad?: string; q?: string }> }) {
  const { aba, cad, q } = await searchParams;
  const tab: Tab = aba === "enviadas" || aba === "encerradas" ? aba : "fila";
  const now = new Date();
  const filter = { cadenceId: cad || undefined, q };

  const [config, cadences, stats] = await Promise.all([
    withReadFallback(() => getWaConfig(), { autoSendEnabled: false, dailyLimit: 100, windowStartHour: 8, windowEndHour: 18 }),
    withReadFallback(() => listCadences(), []),
    withReadFallback(() => getQueueStats(now), EMPTY_STATS),
  ]);
  const budget = await withReadFallback(() => getSendBudget(now, config), { limit: 20, sentToday: 0, remaining: 20 });
  const simulated = getWhatsAppProvider().name === "simulador";

  const queue: QueueItem[] = tab === "fila" ? await withReadFallback(() => listQueue(filter), []) : [];
  const sent: SentItem[] = tab === "enviadas" ? await withReadFallback(() => listSentAutomated(q), []) : [];
  const closed: ClosedItem[] = tab === "encerradas" ? await withReadFallback(() => listClosed(filter), []) : [];

  // Por que nada está saindo agora? (só importa quando há alguém esperando)
  const insideWindow = isWithinSendWindow(now, config.windowStartHour, config.windowEndHour);
  const blocker = !config.autoSendEnabled
    ? "O envio automático está desligado: nada sai sozinho. Ligue em Cadências quando quiser começar."
    : !insideWindow
      ? `Fora do horário de envio (segunda a sábado, ${config.windowStartHour}h às ${config.windowEndHour}h). As mensagens saem quando o horário abrir.`
      : budget.remaining <= 0
        ? `O limite de hoje (${budget.limit}) já foi atingido. O resto sai amanhã.`
        : null;

  return (
    <div>
      <PageHeader title="Fila de envios" description="Acompanhe quem já recebeu, quem ainda está na fila e o que vai sair em seguida. Dá para enviar na hora, adiar ou cancelar." />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Na fila" value={stats.queued} hint="esperando a vez de receber" />
        <Stat label="Enviadas hoje" value={`${budget.sentToday} / ${budget.limit}`} hint="limite do dia" />
        <Stat label="Responderam" value={stats.replies} hint="cadência parou sozinha" />
        <Stat label="Concluídas / paradas" value={`${stats.concluded} / ${stats.stopped}`} />
      </div>

      {stats.queued > 0 && blocker ? (
        <div className="mb-5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm">{blocker}</div>
      ) : null}
      {simulated ? <p className="mb-4 text-xs text-amber-500">Modo simulação: “enviar agora” só registra a mensagem na conversa, nada vai para o WhatsApp.</p> : null}

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        {(
          [
            ["fila", `Na fila (${stats.queued})`],
            ["enviadas", "Já enviadas"],
            ["encerradas", `Encerradas (${stats.concluded + stats.stopped})`],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <Link key={key} href={href({ aba: key === "fila" ? undefined : key, cad, q })} className={`rounded-full border px-3 py-1.5 ${tab === key ? "border-petrol bg-petrol/15" : "border-mist text-graphite hover:border-petrol"}`}>
            {label}
          </Link>
        ))}
        <form action="/admin/conversas/fila" className="ml-auto flex min-w-[200px] flex-1 justify-end sm:flex-none">
          {aba ? <input type="hidden" name="aba" value={aba} /> : null}
          {cad ? <input type="hidden" name="cad" value={cad} /> : null}
          <input name="q" defaultValue={q ?? ""} placeholder="Buscar nome ou telefone" className="w-full rounded-lg border border-mist bg-transparent px-3 py-1.5 text-sm outline-none focus:border-petrol sm:w-64" />
        </form>
      </div>

      {tab !== "enviadas" && cadences.length > 1 ? (
        <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-graphite">Cadência:</span>
          <Link href={href({ aba, q })} className={`rounded-full border px-2.5 py-1 ${!cad ? "border-petrol bg-petrol/15" : "border-mist text-graphite hover:border-petrol"}`}>
            Todas
          </Link>
          {cadences.map((c) => (
            <Link key={c.id} href={href({ aba, cad: c.id, q })} className={`rounded-full border px-2.5 py-1 ${cad === c.id ? "border-petrol bg-petrol/15" : "border-mist text-graphite hover:border-petrol"}`}>
              {c.name}
            </Link>
          ))}
        </div>
      ) : null}

      {tab === "fila" ? (
        <>
          {queue.length > 0 ? (
            <div className="mb-3 flex justify-end">
              <BulkCancelButton ids={queue.map((i) => i.id)} />
            </div>
          ) : null}
          <div className="admin-card overflow-x-auto rounded-xl border border-mist">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-mist text-xs text-graphite">
                  <th className="px-4 py-3 font-medium">Contato</th>
                  <th className="px-4 py-3 font-medium">Cadência</th>
                  <th className="px-4 py-3 font-medium">Próxima mensagem</th>
                  <th className="px-4 py-3 font-medium">Quando</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-mist">
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-graphite">
                      {q || cad ? "Ninguém na fila com esse filtro." : "Ninguém na fila. Importe uma lista ou coloque um contato numa cadência."}
                    </td>
                  </tr>
                ) : (
                  queue.map((item) => {
                    const display = item.name ?? formatPhone(item.phone);
                    return (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <Link href={`/admin/conversas?c=${item.conversationId}`} className="font-medium hover:text-petrol">
                            {display}
                          </Link>
                          {item.name ? <p className="text-xs text-graphite">{formatPhone(item.phone)}</p> : null}
                        </td>
                        <td className="px-4 py-3">
                          <p>{item.cadenceName}</p>
                          {!item.cadenceActive ? <StatusBadge tone="warning">cadência pausada</StatusBadge> : null}
                        </td>
                        <td className="max-w-[320px] px-4 py-3">
                          <p className="text-xs text-graphite">
                            Mensagem {item.stepIndex + 1} de {item.totalSteps}
                            {item.attempts > 0 ? ` · falhou ${item.attempts}x, tenta de novo` : ""}
                          </p>
                          <p className="truncate text-graphite" title={item.nextText}>
                            {item.nextText || "—"}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <p className="font-medium">{relativeFromNow(item.nextRunAt, now)}</p>
                          <p className="text-xs text-graphite">{stamp(item.nextRunAt)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <QueueRowActions id={item.id} name={display} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {queue.length >= 300 ? <p className="mt-2 text-xs text-graphite">Mostrando os 300 próximos. Use a busca ou o filtro de cadência para ver os demais.</p> : null}
        </>
      ) : null}

      {tab === "enviadas" ? (
        <div className="admin-card overflow-x-auto rounded-xl border border-mist">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-mist text-xs text-graphite">
                <th className="px-4 py-3 font-medium">Contato</th>
                <th className="px-4 py-3 font-medium">Mensagem</th>
                <th className="px-4 py-3 font-medium">Situação</th>
                <th className="px-4 py-3 font-medium">Quando</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {sent.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-graphite">
                    {q ? "Nada encontrado." : "Nenhuma mensagem automática enviada ainda."}
                  </td>
                </tr>
              ) : (
                sent.map((m) => {
                  const status = MESSAGE_STATUS[m.status] ?? { label: m.status, tone: "neutral" as BadgeTone };
                  return (
                    <tr key={m.id}>
                      <td className="px-4 py-3">
                        <Link href={`/admin/conversas?c=${m.conversationId}`} className="font-medium hover:text-petrol">
                          {m.name ?? formatPhone(m.phone)}
                        </Link>
                      </td>
                      <td className="max-w-[360px] px-4 py-3">
                        <p className="truncate text-graphite" title={m.body}>
                          {m.body}
                        </p>
                        {m.error ? <p className="text-xs text-red-400">{m.error}</p> : null}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                          {m.replied ? <StatusBadge tone="success">Respondeu</StatusBadge> : null}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-graphite">{stamp(m.createdAt)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === "encerradas" ? (
        <div className="admin-card overflow-x-auto rounded-xl border border-mist">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-mist text-xs text-graphite">
                <th className="px-4 py-3 font-medium">Contato</th>
                <th className="px-4 py-3 font-medium">Cadência</th>
                <th className="px-4 py-3 font-medium">Situação</th>
                <th className="px-4 py-3 font-medium">Enviadas</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {closed.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-graphite">
                    Nenhuma cadência encerrada ainda.
                  </td>
                </tr>
              ) : (
                closed.map((c) => {
                  const resumable = c.status === "parada" && (c.stopReason === "parada manualmente" || c.stopReason === "falha no envio");
                  return (
                    <tr key={c.id}>
                      <td className="px-4 py-3">
                        <Link href={`/admin/conversas?c=${c.conversationId}`} className="font-medium hover:text-petrol">
                          {c.name ?? formatPhone(c.phone)}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-graphite">{c.cadenceName}</td>
                      <td className="px-4 py-3">
                        {c.status === "concluida" ? <StatusBadge tone="success">Concluída</StatusBadge> : <StatusBadge tone={c.stopReason === "respondeu" ? "success" : "neutral"}>{c.stopReason === "respondeu" ? "Respondeu" : "Parada"}</StatusBadge>}
                        {c.status === "parada" && c.stopReason && c.stopReason !== "respondeu" ? <p className="mt-0.5 text-xs text-graphite">{c.stopReason}</p> : null}
                      </td>
                      <td className="px-4 py-3 text-graphite">
                        {Math.min(c.stepIndex, c.totalSteps)} de {c.totalSteps}
                      </td>
                      <td className="px-4 py-3 text-right">{resumable ? <ResumeButton id={c.id} /> : null}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
