import { SettingsForm } from "@/components/admin/settings-form";
import { AdditionalCostsManager } from "@/components/admin/additional-costs-manager";
import { getSettings } from "@/server/repositories/settings-repository";
import { getAllAdditionalCosts } from "@/server/repositories/additional-cost-repository";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackAdditionalCosts } from "@/server/demo-fallback";
import { DEFAULT_WHATSAPP_NUMBER } from "@/lib/site-config";

export default async function AdminSettingsPage() {
  const [settings, additionalCosts] = await Promise.all([
    withReadFallback(() => getSettings(), {
      freeShippingThreshold: 299.9,
      whatsappNumber: DEFAULT_WHATSAPP_NUMBER,
    }),
    withReadFallback(() => getAllAdditionalCosts(), fallbackAdditionalCosts),
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="font-display mb-8 text-2xl sm:text-3xl">Configurações</h1>
      <SettingsForm settings={settings} />
      <div className="mt-10">
        <AdditionalCostsManager additionalCosts={additionalCosts} />
      </div>
    </div>
  );
}
