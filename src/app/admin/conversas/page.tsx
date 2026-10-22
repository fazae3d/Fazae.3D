import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { WhatsAppChat } from "@/components/admin/whatsapp-chat";
import { WhatsAppConversationList } from "@/components/admin/whatsapp-conversation-list";
import { WhatsAppLeadPanel, type ContactQuote, type LinkedCustomer } from "@/components/admin/whatsapp-lead-panel";
import { WhatsAppNewConversation } from "@/components/admin/whatsapp-new-conversation";
import { withReadFallback } from "@/lib/db-fallback";
import { phoneKey } from "@/lib/customer-insights";
import { LEAD_STAGES } from "@/lib/whatsapp";
import { getWhatsAppProvider } from "@/server/whatsapp/provider";
import { getAllCustomersWithStats } from "@/server/repositories/customer-repository";
import { getAllQuotes } from "@/server/repositories/quote-repository";
import { QUOTE_STATUS_LABELS, quoteDisplayStatus, quoteNumberLabel } from "@/lib/quote";
import { DEFAULT_WA_CONFIG, getWaConfig, listCadences, listConversationEnrollments, type EnrollmentView } from "@/server/repositories/wa-cadence-repository";
import { listQuickReplies } from "@/server/repositories/wa-quick-reply-repository";
import {
  getConversation,
  getConversationCounts,
  getConversationMessages,
  listConversations,
  type WaConversationView,
} from "@/server/repositories/whatsapp-repository";

export const dynamic = "force-dynamic";

function href(params: { c?: string; f?: string; etapa?: string; q?: string }) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) qs.set(key, value);
  const text = qs.toString();
  return `/admin/conversas${text ? `?${text}` : ""}`;
}

const chip = (active: boolean) => `rounded-full border px-2.5 py-1 ${active ? "border-petrol bg-petrol/15" : "border-mist text-graphite hover:border-petrol"}`;

/** "há 5 min", "há 3 h", "há 2 dias". */
function ago(iso: string, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  return `há ${days} dia${days > 1 ? "s" : ""}`;
}

export default async function ConversasPage({ searchParams }: { searchParams: Promise<{ c?: string; f?: string; etapa?: string; q?: string }> }) {
  const { c, f, etapa, q } = await searchParams;
  const provider = getWhatsAppProvider();
  const stage = LEAD_STAGES.some((s) => s.key === etapa) ? etapa : undefined;

  const [conversations, selected, status, counts, config, cadences, quickReplies] = await Promise.all([
    withReadFallback(() => listConversations({ onlyUnread: f === "nao-lidas", waiting: f === "aguardando", due: f === "hoje", stage, q }), [] as WaConversationView[]),
    c ? withReadFallback(() => getConversation(c), null) : Promise.resolve(null),
    provider.name === "uazapi" ? provider.connectionStatus() : Promise.resolve(null),
    withReadFallback(() => getConversationCounts(), { waiting: 0, due: 0 }),
    withReadFallback(() => getWaConfig(), DEFAULT_WA_CONFIG),
    withReadFallback(() => listCadences(), []),
    withReadFallback(() => listQuickReplies(), []),
  ]);
  const messages = selected ? await withReadFallback(() => getConversationMessages(selected.id), []) : [];
  const activeCadences = cadences.filter((cd) => cd.active).map((cd) => ({ id: cd.id, name: cd.name }));
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
        .filter((qt) => phoneKey(qt.customerPhone) === phoneKey(selected.phone))
        .slice(0, 8)
        .map((qt) => ({ id: qt.id, label: `${quoteNumberLabel(qt.number)}${qt.title ? ` · ${qt.title}` : ""}`, status: QUOTE_STATUS_LABELS[quoteDisplayStatus(qt)], total: qt.total, validUntil: qt.validUntil }))
    : [];
  const simulated = provider.name === "simulador";
  const unreadTotal = conversations.reduce((sum, cv) => sum + (cv.unreadCount > 0 ? 1 : 0), 0);
  const quietFor = config.lastWebhookAt ? Date.now() - new Date(config.lastWebhookAt).getTime() : null;
  const listParams = { f, etapa: stage, q };

  return (
    <div>
      <PageHeader title="Conversas" description="WhatsApp da loja: responda, acompanhe cada lead e veja em que etapa ele está." />

      {simulated ? (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm">
          <strong>Modo simulação.</strong> Nada é enviado de verdade: dá para testar todas as telas. Para conectar, configure UAZAPI_URL, UAZAPI_TOKEN e WHATSAPP_WEBHOOK_SECRET.
        </div>
      ) : status && status.known && !status.connected ? (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm">
          <strong>WhatsApp desconectado.</strong> {status.detail ?? "Reconecte o número na uazapi."} Enquanto isso, as mensagens não saem nem chegam.
        </div>
      ) : config.pausedReason ? (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm">
          <strong>Envio automático pausado:</strong> {config.pausedReason}. Veja em Cadências.
        </div>
      ) : !simulated && (quietFor === null || quietFor > 12 * 3_600_000) ? (
        <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm">
          <strong>Sem sinal do WhatsApp</strong> {config.lastWebhookAt ? `desde ${ago(config.lastWebhookAt)}` : "(nenhum evento recebido ainda)"}. Se a loja recebeu mensagens nesse tempo, confira o webhook na uazapi.
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
            <Link href={href({ q })} className={chip(!f && !stage)}>
              Todas
            </Link>
            <Link href={href({ f: "aguardando", q })} className={`${chip(f === "aguardando")} ${counts.waiting > 0 && f !== "aguardando" ? "!border-amber-500/60" : ""}`}>
              Aguardando você ({counts.waiting})
            </Link>
            <Link href={href({ f: "hoje", q })} className={chip(f === "hoje")}>
              Para hoje ({counts.due})
            </Link>
            <Link href={href({ f: "nao-lidas", q })} className={chip(f === "nao-lidas")}>
              Não lidas{f === "nao-lidas" ? "" : unreadTotal > 0 && !stage ? ` (${unreadTotal})` : ""}
            </Link>
            {LEAD_STAGES.map((s) => (
              <Link key={s.key} href={href({ etapa: s.key, q })} className={chip(stage === s.key)}>
                {s.label}
              </Link>
            ))}
          </div>

          <WhatsAppConversationList conversations={conversations} selectedId={selected?.id ?? null} params={listParams} cadences={activeCadences} />
        </div>

        {/* Conversa */}
        <div className={`admin-card min-h-0 overflow-hidden rounded-xl border border-mist ${selected ? "flex h-[70vh] flex-col lg:h-auto" : "hidden lg:flex lg:items-center lg:justify-center"}`}>
          {selected ? <WhatsAppChat key={selected.id} conversation={selected} messages={messages} quickReplies={quickReplies} /> : <p className="text-sm text-graphite">Escolha uma conversa para começar.</p>}
        </div>

        {/* Ficha do lead */}
        <div className={`admin-card min-h-0 overflow-y-auto rounded-xl border border-mist ${selected ? "block" : "hidden lg:block"}`}>
          {selected ? (
            <WhatsAppLeadPanel
              key={selected.id + selected.stage + selected.optedOut + (selected.nextActionAt ?? "")}
              conversation={selected}
              customer={customer}
              simulated={simulated}
              cadences={activeCadences}
              enrollments={enrollments}
              quotes={contactQuotes}
            />
          ) : (
            <p className="p-6 text-center text-sm text-graphite">Aqui aparecem etapa, etiquetas e observações do contato.</p>
          )}
        </div>
      </div>
    </div>
  );
}
