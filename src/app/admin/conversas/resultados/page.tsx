import { PageHeader } from "@/components/admin/page-header";
import { withReadFallback } from "@/lib/db-fallback";
import { formatDuration, pct, type WaResults } from "@/lib/wa-results";
import { sourceLabel, stageLabel } from "@/lib/whatsapp";
import { listCadences } from "@/server/repositories/wa-cadence-repository";
import { getWaResults } from "@/server/repositories/wa-results-repository";

export const dynamic = "force-dynamic";

const EMPTY: WaResults = {
  total: 0,
  replied: 0,
  won: 0,
  lost: 0,
  optedOut: 0,
  byStage: [],
  bySource: [],
  byCadence: [],
  response: { count: 0, medianMinutes: null, averageMinutes: null },
};

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="admin-card rounded-xl border border-mist p-4">
      <p className="text-xs text-graphite">{label}</p>
      <p className="font-display mt-1 text-2xl">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-graphite">{hint}</p> : null}
    </div>
  );
}

export default async function ResultadosPage() {
  const [results, cadences] = await Promise.all([withReadFallback(() => getWaResults(90), EMPTY), withReadFallback(() => listCadences(), [])]);
  const nameOf = (id: string) => cadences.find((c) => c.id === id)?.name ?? "Cadência removida";
  const stepText = (id: string, index: number) => cadences.find((c) => c.id === id)?.steps[index]?.text ?? "";
  const maxStage = Math.max(1, ...results.byStage.map((s) => s.count));
  const active = results.total - results.optedOut;

  return (
    <div className="space-y-6">
      <PageHeader title="Resultados" description="Como o WhatsApp está funcionando: funil, origem dos contatos, desempenho de cada cadência e tempo de resposta (mensagens dos últimos 90 dias)." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Contatos" value={results.total} hint={`${results.optedOut} pediram para sair`} />
        <Stat label="Já responderam" value={`${pct(results.replied, active)}%`} hint={`${results.replied} de ${active} contatos`} />
        <Stat label="Ganhos" value={results.won} hint={`${pct(results.won, results.total)}% dos contatos`} />
        <Stat label="1ª resposta (mediana)" value={formatDuration(results.response.medianMinutes)} hint={results.response.count ? `média ${formatDuration(results.response.averageMinutes)} · ${results.response.count} conversas` : "ainda sem dados"} />
      </div>

      <div className="admin-card rounded-xl border border-mist p-5">
        <p className="font-medium">Funil</p>
        <ul className="mt-4 space-y-3">
          {results.byStage.map((s) => (
            <li key={s.key}>
              <div className="flex items-center justify-between text-sm">
                <span>{stageLabel(s.key)}</span>
                <span className="text-graphite">
                  {s.count} · {pct(s.count, results.total)}%
                </span>
              </div>
              <div className="mt-1 h-2 w-full rounded-full bg-mist">
                <div className={`h-2 rounded-full ${s.key === "perdido" ? "bg-red-500/70" : "bg-petrol"}`} style={{ width: `${(s.count / maxStage) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="admin-card overflow-x-auto rounded-xl border border-mist">
        <p className="px-5 pt-5 font-medium">De onde vêm os contatos</p>
        <table className="mt-3 w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-mist text-xs text-graphite">
              <th className="px-5 py-3 font-medium">Origem</th>
              <th className="px-5 py-3 text-right font-medium">Contatos</th>
              <th className="px-5 py-3 text-right font-medium">Responderam</th>
              <th className="px-5 py-3 text-right font-medium">Ganhos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {results.bySource.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-graphite">
                  Sem contatos ainda.
                </td>
              </tr>
            ) : (
              results.bySource.map((s) => (
                <tr key={s.key}>
                  <td className="px-5 py-3 font-medium">{sourceLabel(s.key)}</td>
                  <td className="px-5 py-3 text-right">{s.total}</td>
                  <td className="px-5 py-3 text-right">
                    {s.replied} <span className="text-graphite">({pct(s.replied, s.total)}%)</span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {s.won} <span className="text-graphite">({pct(s.won, s.total)}%)</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-card rounded-xl border border-mist p-5">
        <p className="font-medium">Desempenho das cadências</p>
        <p className="mt-1 text-sm text-graphite">“Respondeu” conta quando o contato escreve em até 72 horas depois da mensagem. Compare as mensagens para saber qual texto funciona e qual vale reescrever.</p>
        {results.byCadence.length === 0 ? (
          <p className="mt-4 text-sm text-graphite">Nenhuma mensagem de cadência enviada ainda.</p>
        ) : (
          <div className="mt-4 space-y-5">
            {results.byCadence.map((c) => (
              <div key={c.cadenceId}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{nameOf(c.cadenceId)}</p>
                  <p className="text-xs text-graphite">
                    {c.sent} enviadas · lidas {pct(c.read, c.sent)}% · <strong className="text-ink">responderam {pct(c.replied, c.sent)}%</strong>
                  </p>
                </div>
                <ul className="mt-2 divide-y divide-mist rounded-lg border border-mist text-sm">
                  {c.steps.map((s) => (
                    <li key={s.stepIndex} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <span className="min-w-0 flex-1 truncate">
                        <span className="text-graphite">Mensagem {s.stepIndex + 1}:</span> {stepText(c.cadenceId, s.stepIndex).slice(0, 70) || "—"}
                      </span>
                      <span className="shrink-0 text-xs text-graphite">
                        {s.sent} enviadas · lidas {pct(s.read, s.sent)}% · respostas {pct(s.replied, s.sent)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
