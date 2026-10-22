import { PageHeader } from "@/components/admin/page-header";
import { WhatsAppFunnelBoard } from "@/components/admin/whatsapp-funnel-board";
import { withReadFallback } from "@/lib/db-fallback";
import { listConversations, type WaConversationView } from "@/server/repositories/whatsapp-repository";

export const dynamic = "force-dynamic";

export default async function FunilPage() {
  const conversations = await withReadFallback(() => listConversations({}), [] as WaConversationView[]);
  return (
    <div>
      <PageHeader title="Funil" description="Cada contato na sua etapa. Arraste o cartão para mudar de etapa; “Abrir” leva para a conversa." />
      <WhatsAppFunnelBoard conversations={conversations} />
      {conversations.length >= 200 ? <p className="text-xs text-graphite">Mostrando as 200 conversas mais recentes.</p> : null}
    </div>
  );
}
