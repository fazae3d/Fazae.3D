import { PageHeader } from "@/components/admin/page-header";
import { WhatsAppImportContacts } from "@/components/admin/whatsapp-import-contacts";
import { withReadFallback } from "@/lib/db-fallback";
import { listCadences } from "@/server/repositories/wa-cadence-repository";

export const dynamic = "force-dynamic";

export default async function ImportarPage() {
  const cadences = await withReadFallback(() => listCadences(), []);
  return (
    <div>
      <PageHeader title="Importar lista" description="Suba uma planilha com nome e telefone para criar os contatos e, se quiser, já colocar todos numa cadência." />
      <WhatsAppImportContacts cadences={cadences.filter((c) => c.active).map((c) => ({ id: c.id, name: c.name }))} />
    </div>
  );
}
