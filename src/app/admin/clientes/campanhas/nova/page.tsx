import { auth } from "@/auth";
import { CampaignComposer } from "@/components/admin/campaign-composer";
import { PageHeader } from "@/components/admin/page-header";
import { withReadFallback } from "@/lib/db-fallback";
import { getActiveRecipients } from "@/server/repositories/campaign-repository";

export const metadata = { title: "Nova campanha" };
export const maxDuration = 60;

export default async function NewCampaignPage() {
  const [recipients, session] = await Promise.all([withReadFallback(() => getActiveRecipients(), []), auth()]);
  return (
    <div>
      <PageHeader title="Nova campanha" description="Escreva o e-mail, confira a prévia, envie um teste para você e só então envie para os contatos." />
      <CampaignComposer
        campaignId={null}
        initial={{ subject: "", heading: "", body: "", buttonLabel: "", buttonUrl: "" }}
        status="rascunho"
        recipientsCount={recipients.length}
        alreadyDelivered={0}
        failed={0}
        adminEmail={session?.user?.email ?? ""}
      />
    </div>
  );
}
