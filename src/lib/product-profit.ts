import { round2, pixPrice } from "@/lib/money";
import type { Order } from "@/server/types";

export type ProfitRow = {
  slug: string;
  name: string;
  categoryName: string;
  price: number | null;
  materialCost: number;
  laborCost: number;
  unitCost: number;
  margin: number | null;
  marginPct: number | null;
  pixMargin: number | null;
  /** Sem ficha técnica (insumos) nem mão de obra cadastrados: o custo é zero e a margem engana. */
  missingCost: boolean;
  unitsSold: number;
  revenue: number;
  profit: number;
};

/**
 * Lucro por produto = preço - (insumos da ficha técnica + mão de obra). Considera só pedidos pagos (não cancelados nem
 * aguardando pagamento). Não desconta a taxa do Mercado Pago por produto (ela é por pedido e aparece em Finanças).
 */
export function buildProfitRows(
  products: { slug: string; name: string; categoryName: string; price?: number; laborCost?: number }[],
  materialCostBySlug: Map<string, number>,
  orders: Order[],
  pixPct: number,
): ProfitRow[] {
  const sold = new Map<string, { units: number; revenue: number }>();
  for (const order of orders) {
    if (order.status === "Cancelado" || order.status === "Pedido recebido") continue;
    for (const item of order.items) {
      const entry = sold.get(item.productSlug) ?? { units: 0, revenue: 0 };
      entry.units += item.quantity;
      entry.revenue = round2(entry.revenue + item.price * item.quantity);
      sold.set(item.productSlug, entry);
    }
  }

  return products
    .map((p) => {
      const materialCost = round2(materialCostBySlug.get(p.slug) ?? 0);
      const laborCost = round2(p.laborCost ?? 0);
      const unitCost = round2(materialCost + laborCost);
      const price = p.price ?? null;
      const margin = price !== null ? round2(price - unitCost) : null;
      const s = sold.get(p.slug) ?? { units: 0, revenue: 0 };
      return {
        slug: p.slug,
        name: p.name,
        categoryName: p.categoryName,
        price,
        materialCost,
        laborCost,
        unitCost,
        margin,
        marginPct: price !== null && price > 0 && margin !== null ? round2((margin / price) * 100) : null,
        pixMargin: price !== null ? round2(pixPrice(price, pixPct) - unitCost) : null,
        missingCost: unitCost === 0,
        unitsSold: s.units,
        revenue: s.revenue,
        profit: margin !== null ? round2(margin * s.units) : 0,
      };
    })
    .sort((a, b) => b.profit - a.profit || a.name.localeCompare(b.name, "pt-BR"));
}
