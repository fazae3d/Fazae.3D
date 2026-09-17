import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { ConsigneeDetailHeader } from "@/components/admin/consignee-detail-header";
import { ConsignmentItemsPanel } from "@/components/admin/consignment-items-panel";
import { ConsignmentVisitsPanel } from "@/components/admin/consignment-visits-panel";
import { getConsigneeById } from "@/server/repositories/consignment-repository";
import { getAllProducts } from "@/server/repositories/product-repository";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackProducts } from "@/server/demo-fallback";

export default async function ConsigneeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [detail, products] = await Promise.all([
    withReadFallback(() => getConsigneeById(id), undefined),
    withReadFallback(() => getAllProducts(), fallbackProducts),
  ]);

  if (!detail) notFound();

  const availableProducts = products
    .filter((p) => p.type === "pronta_entrega" && p.stock > 0)
    .map((p) => ({ slug: p.slug, name: p.name, stock: p.stock }));

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Breadcrumb
        items={[
          { label: "Início", href: "/admin" },
          { label: "Consignação", href: "/admin/consignacao" },
          { label: detail.consignee.name },
        ]}
      />

      <ConsigneeDetailHeader consignee={detail.consignee} />
      <ConsignmentItemsPanel consigneeId={id} items={detail.items} availableProducts={availableProducts} />
      <ConsignmentVisitsPanel consigneeId={id} visits={detail.visits} />
    </div>
  );
}
