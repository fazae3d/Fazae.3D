import { getAllOrders } from "@/server/repositories/order-repository";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackOrders } from "@/server/demo-fallback";
import { ProductionBoard } from "@/components/admin/production-board";

export default async function AdminProductionPage() {
  const orders = await withReadFallback(() => getAllOrders(), fallbackOrders);
  const productionOrders = orders.filter((order) => order.productionStage && order.productionStage !== "nao_aplicavel");

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl sm:text-3xl">Produção</h1>
        <p className="mt-1 text-sm text-graphite">
          {productionOrders.length} pedido(s) em produção ou aguardando início
        </p>
      </div>

      <ProductionBoard orders={productionOrders} />
    </div>
  );
}
