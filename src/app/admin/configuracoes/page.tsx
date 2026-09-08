import { SettingsForm } from "@/components/admin/settings-form";
import { getSettings } from "@/server/repositories/settings-repository";
import { withReadFallback } from "@/lib/db-fallback";
import { DEFAULT_WHATSAPP_NUMBER } from "@/lib/site-config";

export default async function AdminSettingsPage() {
  const settings = await withReadFallback(() => getSettings(), {
    freeShippingThreshold: 299.9,
    whatsappNumber: DEFAULT_WHATSAPP_NUMBER,
  });

  return (
    <div>
      <h1 className="font-display mb-8 text-2xl sm:text-3xl">Configurações</h1>
      <SettingsForm settings={settings} />
    </div>
  );
}
