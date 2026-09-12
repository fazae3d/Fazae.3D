import { getProduct } from "@/lib/demo-data";
import { computeMaterialCost } from "@/server/repositories/product-material-usage-repository";
import { getSettings } from "@/server/repositories/settings-repository";
import { getAllAdditionalCosts } from "@/server/repositories/additional-cost-repository";
import { PricingCalculator } from "@/components/admin/pricing-calculator";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackAdditionalCosts, fallbackProductMaterialUsages, fallbackProducts } from "@/server/demo-fallback";
import { DEFAULT_WHATSAPP_NUMBER } from "@/lib/site-config";

export default async function AdminPricingPage({
  searchParams,
}: {
  searchParams: Promise<{ produto?: string }>;
}) {
  const params = await searchParams;
  const slug = params.produto?.trim();

  let productName: string | undefined;
  let initialMaterialCost = 0;
  let initialLaborCost: number | undefined;

  const [settings, additionalCosts] = await Promise.all([
    withReadFallback(() => getSettings(), {
      freeShippingThreshold: 299.9,
      whatsappNumber: DEFAULT_WHATSAPP_NUMBER,
    }),
    withReadFallback(() => getAllAdditionalCosts(), fallbackAdditionalCosts),
  ]);

  if (slug) {
    const product = await withReadFallback(
      () => getProduct(slug),
      fallbackProducts.find((p) => p.slug === slug),
    );
    if (product) {
      productName = product.name;
      initialLaborCost = product.laborCost;
      initialMaterialCost = await withReadFallback(
        () => computeMaterialCost(slug),
        fallbackProductMaterialUsages
          .filter((usage) => usage.productSlug === slug)
          .reduce((sum, usage) => sum + usage.quantity * usage.rawMaterialCostPerUnit, 0),
      );
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display mb-8 text-2xl sm:text-3xl">Precificação</h1>
      <p className="mb-8 text-sm text-graphite">
        Ferramenta de apoio para sugerir um preço de venda. Os valores não são salvos no produto.
      </p>
      <PricingCalculator
        productName={productName}
        initialMaterialCost={initialMaterialCost}
        initialLaborCost={initialLaborCost}
        defaults={settings}
        additionalCosts={additionalCosts}
      />
    </div>
  );
}
