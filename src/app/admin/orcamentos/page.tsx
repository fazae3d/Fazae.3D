import Link from "next/link";
import { PageHeader, StatusBadge } from "@/components/admin/page-header";
import { QuoteFollowUpButton } from "@/components/admin/quote-follow-up-button";
import { SITE_URL } from "@/lib/site-config";
import { withReadFallback } from "@/lib/db-fallback";
import { formatPrice } from "@/lib/format";
import {
  QUOTE_STATUS_LABELS,
  daysUntil,
  formatStoreDate,
  needsFollowUp,
  quoteDisplayStatus,
  quoteNumberLabel,
  type QuoteDisplayStatus,
} from "@/lib/quote";
import { round2 } from "@/lib/money";
import { getAllQuotes } from "@/server/repositories/quote-repository";
import { QUOTE_TONES } from "./quote-tones";

const FILTERS: { key: QuoteDisplayStatus | ""; label: string }[] = [
  { key: "", label: "Todos" },
  { key: "rascunho", label: "Rascunhos" },
  { key: "enviado", label: "Enviados" },
  { key: "aprovado", label: "Aprovados" },
  { key: "recusado", label: "Recusados" },
  { key: "vencido", label: "Vencidos" },
];

function href(params: { status?: string; q?: string }) {
  const search = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
  return `/admin/orcamentos${search ? `?${search}` : ""}`;
}

export default async function QuotesPage({ searchParams }: PageProps<"/admin/orcamentos">) {
  const params = await searchParams;
  const statusFilter = typeof params.status === "string" ? params.status : "";
  const query = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";

  const quotes = await withReadFallback(() => getAllQuotes(), []);
  const withStatus = quotes.map((quote) => ({ quote, status: quoteDisplayStatus(quote) }));

  const open = withStatus.filter((x) => x.status === "enviado" || x.status === "rascunho");
  const sent = withStatus.filter((x) => x.status === "enviado");
  const approved = withStatus.filter((x) => x.status === "aprovado");
  const decided = withStatus.filter((x) => x.status === "aprovado" || x.status === "recusado" || x.status === "vencido");
  const conversion = decided.length ? Math.round((approved.length / decided.length) * 100) : null;
  const expiringSoon = sent.filter((x) => daysUntil(x.quote.validUntil) >= 0 && daysUntil(x.quote.validUntil) <= 3).length;

  const followUps = quotes.filter((q) => needsFollowUp(q)).sort((a, b) => daysUntil(a.validUntil) - daysUntil(b.validUntil));

  const filtered = withStatus
    .filter((x) => !statusFilter || x.status === statusFilter)
    .filter(
      (x) =>
        !query ||
        x.quote.customerName.toLowerCase().includes(query) ||
        quoteNumberLabel(x.quote.number).toLowerCase().includes(query) ||
        (x.quote.title ?? "").toLowerCase().includes(query),
    );

  return (
    <div>
      <PageHeader
        title="Orçamentos"
        description="Monte propostas, gere o PDF e acompanhe a resposta do cliente."
        actions={
          <Link href="/admin/orcamentos/novo" className="rounded-lg bg-petrol px-4 py-2.5 text-sm font-semibold text-[#111] transition-opacity hover:opacity-90">
            Novo orçamento
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Em aberto", value: String(open.length), sub: formatPrice(round2(open.reduce((s, x) => s + x.quote.total, 0))) },
          { label: "Aguardando resposta", value: String(sent.length), sub: expiringSoon ? `${expiringSoon} vence(m) em até 3 dias` : "Nenhum perto de vencer" },
          { label: "Aprovados", value: String(approved.length), sub: formatPrice(round2(approved.reduce((s, x) => s + x.quote.total, 0))) },
          { label: "Taxa de aprovação", value: conversion === null ? "Sem dados" : `${conversion}%`, sub: "dos orçamentos já decididos" },
        ].map((kpi) => (
          <div key={kpi.label} className="admin-card rounded-xl border border-mist p-4">
            <p className="text-xs text-graphite">{kpi.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">{kpi.value}</p>
            <p className="mt-0.5 text-xs text-graphite">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {followUps.length > 0 && (
        <section className="admin-card mb-6 rounded-xl border border-amber-500/40 p-5">
          <h2 className="text-sm font-semibold">Acompanhar ({followUps.length})</h2>
          <p className="mb-3 mt-0.5 text-xs text-graphite">
            Enviados há 3 dias ou mais sem resposta, ou perto de vencer. Um contato rápido costuma destravar a decisão.
          </p>
          <ul className="divide-y divide-mist">
            {followUps.map((quote) => {
              const left = daysUntil(quote.validUntil);
              return (
                <li key={quote.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <Link href={`/admin/orcamentos/${quote.id}`} className="font-medium hover:text-petrol">
                      {quoteNumberLabel(quote.number)} · {quote.customerName}
                    </Link>
                    <p className="text-xs text-graphite">
                      {formatPrice(quote.total)} · {left <= 0 ? "vence hoje" : `vence em ${left} dia(s)`}
                      {quote.lastFollowUpAt ? ` · último contato ${formatStoreDate(quote.lastFollowUpAt)}` : quote.sentAt ? ` · enviado em ${formatStoreDate(quote.sentAt)}` : ""}
                    </p>
                  </div>
                  <QuoteFollowUpButton
                    publicUrl={SITE_URL}
                    quote={{
                      id: quote.id,
                      number: quote.number,
                      token: quote.token,
                      customerName: quote.customerName,
                      customerPhone: quote.customerPhone,
                      total: quote.total,
                      validUntil: quote.validUntil,
                    }}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={href({ status: f.key, q: query })}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                statusFilter === f.key ? "admin-chip-active" : "border-mist text-graphite hover:border-petrol hover:text-ink"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <form action="/admin/orcamentos" className="flex gap-2">
          <input type="hidden" name="status" value={statusFilter} />
          <input
            name="q"
            defaultValue={query}
            placeholder="Buscar cliente ou número"
            className="w-56 rounded-lg border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol"
          />
        </form>
      </div>

      {filtered.length === 0 ? (
        <div className="admin-card rounded-xl border border-mist px-6 py-16 text-center">
          <p className="font-medium">{quotes.length === 0 ? "Crie seu primeiro orçamento" : "Nenhum orçamento nesse filtro"}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-graphite">
            {quotes.length === 0
              ? "Escolha itens do catálogo ou descreva uma peça sob medida, e envie um PDF profissional ao cliente."
              : "Troque o filtro ou limpe a busca."}
          </p>
          {quotes.length === 0 ? (
            <Link href="/admin/orcamentos/novo" className="mt-5 inline-block rounded-lg bg-petrol px-4 py-2.5 text-sm font-semibold text-[#111]">
              Novo orçamento
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="admin-card overflow-x-auto rounded-xl border border-mist">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-mist text-left text-xs text-graphite">
                <th className="px-5 py-3 font-medium">Número</th>
                <th className="px-3 py-3 font-medium">Cliente</th>
                <th className="px-3 py-3 font-medium">Situação</th>
                <th className="px-3 py-3 font-medium">Validade</th>
                <th className="px-5 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(({ quote, status }) => {
                const left = daysUntil(quote.validUntil);
                return (
                  <tr key={quote.id} className="border-b border-mist transition-colors last:border-0 hover:bg-mist/40">
                    <td className="px-5 py-3">
                      <Link href={`/admin/orcamentos/${quote.id}`} className="font-medium hover:text-petrol">
                        {quoteNumberLabel(quote.number)}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <p>{quote.customerName}</p>
                      {quote.title ? <p className="text-xs text-graphite">{quote.title}</p> : null}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge tone={QUOTE_TONES[status]}>{QUOTE_STATUS_LABELS[status]}</StatusBadge>
                    </td>
                    <td className="px-3 py-3 text-graphite">
                      {formatStoreDate(quote.validUntil)}
                      {status === "enviado" && left >= 0 && left <= 3 ? (
                        <span className="ml-2 text-amber-500">{left === 0 ? "vence hoje" : `${left}d`}</span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-right font-medium">{formatPrice(quote.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
