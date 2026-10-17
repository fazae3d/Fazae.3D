import { ManualSaleForm } from "@/components/admin/manual-sale-form";
import { getAllProducts } from "@/server/repositories/product-repository";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackProducts } from "@/server/demo-fallback";
import { getSettings } from "@/server/repositories/settings-repository";
import { getAllMaterials } from "@/server/repositories/material-repository";
import { PageHeader } from "@/components/admin/page-header";

export default async function NewManualSalePage() {
  const [products, settings, materials] = await Promise.all([
    withReadFallback(() => getAllProducts(), fallbackProducts),
    withReadFallback(() => getSettings(), null),
    withReadFallback(() => getAllMaterials(), []),
  ]);

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Lançar venda"
        description="Registre vendas feitas presencialmente, pelo WhatsApp ou em marketplaces (Mercado Livre, Shopee, TikTok Shop) para manter estoque e faturamento em dia."
      />
      <ManualSaleForm products={products} materials={materials} channelFees={settings?.channelFees ?? {}} />
    </div>
  );
}
