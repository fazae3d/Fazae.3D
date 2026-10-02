import { getAllOrders } from "@/server/repositories/order-repository";
import { getAllProductionItems } from "@/server/repositories/production-item-repository";
import { getAllProducts } from "@/server/repositories/product-repository";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackOrders, fallbackProducts } from "@/server/demo-fallback";
import { ProductionBoard, type ProductionCard } from "@/components/admin/production-board";
import { ProductionItemForm } from "@/components/admin/production-item-form";

export default async function AdminProductionPage() {
  const [orders, productionItems, products] = await Promise.all([
    withReadFallback(() => getAllOrders(), fallbackOrders),
    withReadFallback(() => getAllProductionItems(), []),
    withReadFallback(() => getAllProducts(), fallbackProducts),
  ]);

  const orderCards: ProductionCard[] = orders
    .filter((order) => order.productionStage && order.productionStage !== "nao_aplicavel")
    .map((order) => ({ kind: "order", id: order.id, order }));
  const itemCards: ProductionCard[] = productionItems.map((item) => ({ kind: "item", id: item.id, item }));
  const cards = [...orderCards, ...itemCards];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl sm:text-3xl">Produção</h1>
        <p className="mt-1 text-sm text-graphite">
          {cards.length} pedido(s)/item(ns) em produção ou aguardando início
        </p>
      </div>

      <ProductionItemForm products={products.map((p) => ({ slug: p.slug, name: p.name }))} />

      <ProductionBoard
        cards={cards}
        products={products.map((p) => ({ slug: p.slug, price: p.price, materials: p.materials }))}
      />
    </div>
  );
}
