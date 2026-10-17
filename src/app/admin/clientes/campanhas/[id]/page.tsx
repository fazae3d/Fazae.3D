import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { CampaignComposer } from "@/components/admin/campaign-composer";
import { PageHeader } from "@/components/admin/page-header";
import { withReadFallback } from "@/lib/db-fallback";
import { getActiveRecipients, getCampaign, getDeliveredEmails } from "@/server/repositories/campaign-repository";

export const metadata = { title: "Campanha" };
// O envio roda numa ação do servidor desta página: mais tempo para campanhas com muitos contatos.
export const maxDuration = 60;

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await withReadFallback(() => getCampaign(id), undefined);
  if (!campaign) notFound();

  const [recipients, delivered, session] = await Promise.all([
    withReadFallback(() => getActiveRecipients(), []),
    withReadFallback(() => getDeliveredEmails(id), new Set<string>()),
    auth(),
  ]);
  const remaining = recipients.filter((r) => !delivered.has(r.email)).length;

  return (
    <div>
      <PageHeader title={campaign.subject} description={campaign.status === "rascunho" ? "Rascunho: edite à vontade, nada foi enviado." : undefined} />
      <CampaignComposer
        campaignId={campaign.id}
        initial={{
          subject: campaign.subject,
          heading: campaign.heading,
          body: campaign.body,
          buttonLabel: campaign.buttonLabel ?? "",
          buttonUrl: campaign.buttonUrl ?? "",
        }}
        status={campaign.status}
        recipientsCount={remaining}
        alreadyDelivered={campaign.delivered}
        failed={campaign.failed}
        adminEmail={session?.user?.email ?? ""}
      />
    </div>
  );
}
