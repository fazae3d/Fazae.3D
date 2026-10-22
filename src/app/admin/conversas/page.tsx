import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { WhatsAppChat } from "@/components/admin/whatsapp-chat";
import { WhatsAppLeadPanel, type ContactQuote, type LinkedCustomer } from "@/components/admin/whatsapp-lead-panel";
import { WhatsAppNewConversation } from "@/components/admin/whatsapp-new-conversation";
import { withReadFallback } from "@/lib/db-fallback";
import { phoneKey } from "@/lib/customer-insights";
import { LEAD_STAGES, formatPhone, sourceLabel, stageLabel } from "@/lib/whatsapp";
import { getWhatsAppProvider } from "@/server/whatsapp/provider";
import { getAllCustomersWithStats } from "@/server/repositories/customer-repository";
import { getAllQuotes } from "@/server/repositories/quote-repository";
import { QUOTE_STATUS_LABELS, quoteDisplayStatus, quoteNumberLabel } from "@/lib/quote";
import { listCadences, listConversationEnrollments, type EnrollmentView } from "@/server/repositories/wa-cadence-repository";
import {
  getConversation,
  getConversationMessages,
  listConversations,
  type WaConversationView,
} from "@/server/repositories/whatsapp-repository";

export const dynamic = "force-dynamic";

const STORE_TZ = "America/Fortaleza";

function listTime(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const day = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: STORE_TZ });
  return day(date) === day(new Date())
    ? date.toLocaleTimeString("pt-BR", { timeZone: STORE_TZ, hour: "2-digit", minute: "2-digit" })
    : day(date).slice(0, 5);
}

function href(params: { c?: string; f?: string; etapa?: string; q?: string }) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) qs.set(key, value);
  const text = qs.toString();
  return `/admin/conversas${text ? `?${text}` : ""}`;
}

export default async function ConversasPage({ searchParams }: { searchParams: Promise<{ c?: string; f?: string; etapa?: string; q?: string }> }) {
  const { c, f, etapa, q } = await searchParams;
  const provider = getWhatsAppProvider();
  const stage = LEAD_STAGES.some((s) => s.key === etapa) ? etapa : undefined;

  const [conversations, selected, status] = await Promise.all([
    withReadFallback(() => listConversations({ onlyUnread: f === "nao-lidas", stage, q }), [] as WaConversationView[]),
    c ? withReadFallback(() => getConversation(c), null) : Promise.resolve(null),
    provider.name === "uazapi" ? provider.connectionStatus() : Promise.resolve(null),
  ]);
  const messages = selected ? await withReadFallback(() => getConversationMessages(selected.id), []) : [];
  const activeCadences = selected ? (await withReadFallback(() => listCadences(), [])).filter((c) => c.active).map((c) => ({ id: c.id, name: c.name })) : [];
  const enrollments = selected ? await withReadFallback(() => listConversationEnrollments(selected.id), [] as EnrollmentView[]) : [];

  let customer: LinkedCustomer = null;
  if (selected) {
    const customers = await withReadFallback(() => getAllCustomersWithStats(), []);
    const key = phoneKey(selected.phone);
    const match = customers.find((cu) => phoneKey(cu.phone) === key);
    if (match) customer = { id: match.id, name: match.name, orderCount: match.orderCount, totalSpent: match.totalSpent };
  }

  const contactQuotes: ContactQuote[] = selected
    ? (await withReadFallback(() => getAllQuotes(), []))
        .filter((q) => phoneKey(q.customerPhone) === phoneKey(selected.phone))
        .slice(0, 8)
        .map((q) => ({ id: q.id, label: `${quoteNumberLabel(q.number)}${q.title ? ` · ${q.title}` : ""}`, status: QUOTE_STATUS_LABELS[quoteDisplayStatus(q)], total: q.total, validUntil: q.validUntil }))
    : [];
  const simulated = provider.name === "simulador";
  const unreadTotal = conversations.reduce((sum, cv) => sum + (cv.unreadCount > 0 ? 1 : 0), 0);

  return (
    <div>
      <PageHeader title="Conversas" description="WhatsApp da loja: responda, acompanhe cada lead e veja em que etapa ele está." />

      {simulated ? (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm">
          <strong>Modo simulação.</strong> Nada é enviado de verdade: dá para testar todas as telas. Para conectar, configure UAZAPI_URL, UAZAPI_TOKEN e WHATSAPP_WEBHOOK_SECRET.
        </div>
      ) : status && !status.connected ? (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm">
          <strong>WhatsApp desconectado.</strong> {status.detail ?? "Reconecte o número na uazapi."} Enquanto isso, as mensagens não saem nem chegam.
        </div>
      ) : null}

      <div className="grid gap-4 lg:h-[calc(100vh-18rem)] lg:min-h-[480px] lg:grid-cols-[320px_minmax(0,1fr)_300px]">
        {/* Lista */}
        <div className={`min-h-0 flex-col gap-3 ${selected ? "hidden lg:flex" : "flex"}`}>
          <WhatsAppNewConversation />
          <form action="/admin/conversas" className="flex gap-2">
            {f ? <input type="hidden" name="f" value={f} /> : null}
            {stage ? <input type="hidden" name="etapa" value={stage} /> : null}
            <input name="q" defaultValue={q ?? ""} placeholder="Buscar nome, telefone ou etiqueta" className="w-full rounded-lg border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol" />
          </form>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <Link href={href({ q })} className={`rounded-full border px-2.5 py-1 ${!f && !stage ? "border-petrol bg-petrol/15" : "border-mist text-graphite hover:border-petrol"}`}>
              Todas
            </Link>
            <Link href={href({ f: "nao-lidas", q })} className={`rounded-full border px-2.5 py-1 ${f === "nao-lidas" ? "border-petrol bg-petrol/15" : "border-mist text-graphite hover:border-petrol"}`}>
              Não lidas{f === "nao-lidas" ? "" : unreadTotal > 0 && !stage ? ` (${unreadTotal})` : ""}
            </Link>
            {LEAD_STAGES.map((s) => (
              <Link key={s.key} href={href({ etapa: s.key, q })} className={`rounded-full border px-2.5 py-1 ${stage === s.key ? "border-petrol bg-petrol/15" : "border-mist text-graphite hover:border-petrol"}`}>
                {s.label}
              </Link>
            ))}
          </div>

          <div className="admin-card min-h-0 flex-1 divide-y divide-mist overflow-y-auto rounded-xl border border-mist">
            {conversations.length === 0 ? (
              <p className="p-6 text-center text-sm text-graphite">{q || f || stage ? "Nenhuma conversa com esse filtro." : "Nenhuma conversa ainda. Use “Nova conversa” ou espere o primeiro contato chegar."}</p>
            ) : (
              conversations.map((cv) => (
                <Link
                  key={cv.id}
                  href={href({ c: cv.id, f, etapa: stage, q })}
                  className={`block px-4 py-3 transition-colors hover:bg-mist/50 ${selected?.id === cv.id ? "bg-mist/60" : ""}`}
                >
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
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Conversa */}
        <div className={`admin-card min-h-0 overflow-hidden rounded-xl border border-mist ${selected ? "flex h-[70vh] flex-col lg:h-auto" : "hidden lg:flex lg:items-center lg:justify-center"}`}>
          {selected ? <WhatsAppChat key={selected.id} conversation={selected} messages={messages} /> : <p className="text-sm text-graphite">Escolha uma conversa para começar.</p>}
        </div>

        {/* Ficha do lead */}
        <div className={`admin-card min-h-0 overflow-y-auto rounded-xl border border-mist ${selected ? "block" : "hidden lg:block"}`}>
          {selected ? (
            <WhatsAppLeadPanel key={selected.id + selected.stage + selected.optedOut} conversation={selected} customer={customer} simulated={simulated} cadences={activeCadences} enrollments={enrollments} quotes={contactQuotes} />
          ) : (
            <p className="p-6 text-center text-sm text-graphite">Aqui aparecem etapa, etiquetas e observações do contato.</p>
          )}
        </div>
      </div>
    </div>
  );
}
