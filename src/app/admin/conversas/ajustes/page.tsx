import { PageHeader } from "@/components/admin/page-header";
import { WhatsAppAutomationForm } from "@/components/admin/whatsapp-automation-form";
import { WhatsAppOptOutList } from "@/components/admin/whatsapp-optout-list";
import { WhatsAppQuickReplyManager } from "@/components/admin/whatsapp-quick-reply-manager";
import { withReadFallback } from "@/lib/db-fallback";
import { DEFAULT_WA_CONFIG, getWaConfig } from "@/server/repositories/wa-cadence-repository";
import { listQuickReplies } from "@/server/repositories/wa-quick-reply-repository";
import { DEFAULT_AUTOMATION, getAutomationSettings, listOptedOut } from "@/server/repositories/wa-settings-repository";

export const dynamic = "force-dynamic";

export default async function AjustesPage() {
  const [replies, automation, config, optedOut] = await Promise.all([
    withReadFallback(() => listQuickReplies(), []),
    withReadFallback(() => getAutomationSettings(), DEFAULT_AUTOMATION),
    withReadFallback(() => getWaConfig(), DEFAULT_WA_CONFIG),
    withReadFallback(() => listOptedOut(), []),
  ]);
  const hours = `segunda a sábado, ${config.windowStartHour}h às ${config.windowEndHour}h`;

  return (
    <div className="space-y-6">
      <PageHeader title="Ajustes do WhatsApp" description="Respostas rápidas, respostas automáticas, avisos de pedido e a lista de quem pediu para sair." />
      <WhatsAppQuickReplyManager replies={replies} />
      <WhatsAppAutomationForm initial={automation} hours={hours} />
      <WhatsAppOptOutList contacts={optedOut} />
    </div>
  );
}
