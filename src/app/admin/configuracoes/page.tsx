import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { getSettings } from "@/server/repositories/settings-repository";
import { withReadFallback } from "@/lib/db-fallback";
import { FALLBACK_SETTINGS } from "@/lib/settings-fallback";

export default async function AdminSettingsPage() {
  const settings = await withReadFallback(() => getSettings(), FALLBACK_SETTINGS);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Configurações da loja" description="Frete, Pix e contato. O que mudar aqui vale para a loja inteira." />
      <SettingsForm settings={settings} />
    </div>
  );
}
