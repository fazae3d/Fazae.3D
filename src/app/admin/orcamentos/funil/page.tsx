import Link from "next/link";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { withReadFallback } from "@/lib/db-fallback";
import { formatPrice } from "@/lib/format";
import { buildQuoteFunnel, funnelPeriod, type FunnelStage } from "@/lib/quote-funnel";
import { daysUntil, formatStoreDate, quoteNumberLabel } from "@/lib/quote";
import { getAllQuotes } from "@/server/repositories/quote-repository";

export const dynamic = "force-dynamic";
export const metadata = { title: "Funil de orçamentos" };

const PERIODS = [
  { key: "30", label: "Últimos 30 dias" },
  { key: "90", label: "Últimos 90 dias" },
  { key: "todos", label: "Tudo" },
];

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "positive" | "negative" }) {
  return (
    <div className="admin-card rounded-xl border border-mist p-4">
      <p className="text-xs text-graphite">{label}</p>
      <p className={`font-display mt-1.5 text-2xl ${tone === "positive" ? "text-petrol" : tone === "negative" ? "text-red-500" : ""}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-graphite">{sub}</p> : null}
    </div>
  );
}

function Bar({ label, stage, base, tone }: { label: string; stage: FunnelStage; base: number; tone: string }) {
  const width = base > 0 ? Math.max(stage.count > 0 ? 4 : 0, Math.round((stage.count / base) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="text-graphite">
          <strong className="text-ink">{stage.count}</strong> · {formatPrice(stage.value)}
        </span>
      </div>
      <div className="mt-1 h-2.5 w-full rounded-full bg-mist">
        <div className={`h-2.5 rounded-full ${tone}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default async function QuoteFunnelPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const params = await searchParams;
  const period = funnelPeriod(params.periodo);
  const now = new Date();

  const all = await withReadFallback(() => getAllQuotes(), []);
  const quotes = period.days === null ? all : all.filter((q) => now.getTime() - new Date(q.createdAt).getTime() <= period.days! * 86_400_000);
  const funnel = buildQuoteFunnel(quotes, now);
  const base = funnel.created.count;

  return (
    <div>
      <PageHeader
        title="Funil de orçamentos"
        description="Quantos orçamentos viram venda, quanto dinheiro ficou pelo caminho e por quê. O motivo vem de você, ao marcar “cliente recusou” em cada orçamento."
      />

      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/admin/orcamentos/funil?periodo=${p.key}`}
            className={`rounded-full border px-3 py-1.5 ${period.key === p.key ? "border-petrol bg-petrol/15" : "border-mist text-graphite hover:border-petrol"}`}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {base === 0 ? (
        <EmptyState icon="quotes" title="Nenhum orçamento neste período" description="Quando você criar e enviar orçamentos, o funil aparece aqui." />
      ) : (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi
              label="Taxa de fechamento"
              value={funnel.closeRatePct === null ? "Sem desfecho ainda" : `${funnel.closeRatePct}%`}
              sub="aprovados ÷ (aprovados + recusados + vencidos)"
              tone={funnel.closeRatePct !== null && funnel.closeRatePct >= 40 ? "positive" : undefined}
            />
            <Kpi
              label="Em aberto"
              value={formatPrice(funnel.open.value)}
              sub={`${funnel.open.count} orçamento(s) esperando resposta`}
            />
            <Kpi
              label="Ticket médio aprovado"
              value={funnel.averageApprovedTicket === null ? "Sem aprovados" : formatPrice(funnel.averageApprovedTicket)}
              sub={funnel.averageDaysToApprove !== null ? `aprovam em ${String(funnel.averageDaysToApprove).replace(".", ",")} dia(s) em média` : undefined}
            />
            <Kpi
              label="Dinheiro perdido"
              value={formatPrice(funnel.lostValue)}
              sub={`${funnel.refused.count + funnel.expired.count} orçamento(s) recusados ou vencidos`}
              tone={funnel.lostValue > 0 ? "negative" : undefined}
            />
          </div>

          <section className="admin-card mb-8 rounded-xl border border-mist p-5">
            <h2 className="text-sm font-semibold">Do orçamento à venda</h2>
            <div className="mt-4 space-y-4">
              <Bar label="Criados" stage={funnel.created} base={base} tone="bg-graphite" />
              <Bar label="Enviados ao cliente" stage={funnel.sent} base={base} tone="bg-sky-500" />
              <Bar label="Aprovados (viraram venda)" stage={funnel.approved} base={base} tone="bg-petrol" />
            </div>
            <p className="mt-4 text-xs text-graphite">
              {funnel.sentToApprovedPct !== null ? `${funnel.sentToApprovedPct}% dos enviados já foram aprovados. ` : ""}
              Rascunhos que nunca foram enviados: {funnel.drafts.count}.
            </p>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg border border-mist p-3">
                <p className="text-xs text-graphite">Aguardando resposta</p>
                <p className="mt-0.5 font-medium">
                  {funnel.open.count} · {formatPrice(funnel.open.value)}
                </p>
              </div>
              <div className="rounded-lg border border-mist p-3">
                <p className="text-xs text-graphite">Recusados</p>
                <p className="mt-0.5 font-medium">
                  {funnel.refused.count} · {formatPrice(funnel.refused.value)}
                </p>
              </div>
              <div className="rounded-lg border border-mist p-3">
                <p className="text-xs text-graphite">Venceram sem resposta</p>
                <p className="mt-0.5 font-medium">
                  {funnel.expired.count} · {formatPrice(funnel.expired.value)}
                </p>
              </div>
            </div>
          </section>

          <section className="admin-card mb-8 overflow-x-auto rounded-xl border border-mist">
            <div className="px-5 pt-5">
              <h2 className="text-sm font-semibold">Por que perdemos</h2>
              <p className="mt-1 text-xs text-graphite">
                Quando o motivo mais comum é preço, vale rever a margem ou oferecer parcelamento; se for prazo, avisar a capacidade de produção na hora.
              </p>
            </div>
            {funnel.losses.length === 0 ? (
              <p className="px-5 py-6 text-sm text-graphite">Nenhuma perda neste período.</p>
            ) : (
              <table className="mt-3 w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-mist text-xs text-graphite">
                    <th className="px-5 py-2.5 font-medium">Motivo</th>
                    <th className="px-3 py-2.5 text-right font-medium">Orçamentos</th>
                    <th className="px-3 py-2.5 text-right font-medium">Valor perdido</th>
                    <th className="px-5 py-2.5 text-right font-medium">% das perdas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist">
                  {funnel.losses.map((row) => (
                    <tr key={row.key}>
                      <td className="px-5 py-2.5">{row.label}</td>
                      <td className="px-3 py-2.5 text-right">{row.count}</td>
                      <td className="px-3 py-2.5 text-right">{formatPrice(row.value)}</td>
                      <td className="px-5 py-2.5 text-right text-graphite">{row.pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {funnel.followUps.length > 0 ? (
            <section className="admin-card rounded-xl border border-amber-500/40 p-5">
              <h2 className="text-sm font-semibold">Chame agora: sem resposta há alguns dias</h2>
              <ul className="mt-3 divide-y divide-mist text-sm">
                {funnel.followUps.map((q) => (
                  <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      <Link href={`/admin/orcamentos/${q.id}`} className="font-medium text-petrol hover:underline">
                        {quoteNumberLabel(q.number)}
                      </Link>{" "}
                      · {q.customerName}
                      {q.title ? ` · ${q.title}` : ""}
                    </span>
                    <span className="text-graphite">
                      {formatPrice(q.total)} · vale até {formatStoreDate(q.validUntil)} ({daysUntil(q.validUntil)} dia(s))
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
