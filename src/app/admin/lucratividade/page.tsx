import { getAllOrders } from "@/server/repositories/order-repository";
import { getAllProducts } from "@/server/repositories/product-repository";
import { computeMaterialCost } from "@/server/repositories/product-material-usage-repository";
import { getSettings } from "@/server/repositories/settings-repository";
import { buildProfitRows } from "@/lib/product-profit";
import { DEFAULT_PIX_DISCOUNT_PCT } from "@/lib/money";
import { formatPrice } from "@/lib/format";

export default async function AdminProfitabilityPage() {
  const [products, orders, settings] = await Promise.all([getAllProducts(), getAllOrders(), getSettings().catch(() => null)]);
  const costs = await Promise.all(products.map(async (p) => [p.slug, await computeMaterialCost(p.slug).catch(() => 0)] as const));
  const rows = buildProfitRows(products, new Map(costs), orders, settings?.pixDiscountPct ?? DEFAULT_PIX_DISCOUNT_PCT);
  const totalProfit = rows.reduce((sum, r) => sum + r.profit, 0);
  const missing = rows.filter((r) => r.missingCost).length;

  return (
    <div>
      <h1 className="font-display mb-2 text-2xl sm:text-3xl">Lucro por produto</h1>
      <p className="mb-6 max-w-3xl text-sm text-graphite">
        Quanto sobra em cada produto: preço menos o custo dos insumos (ficha técnica em Produtos) e da mão de obra. O lucro total considera
        só pedidos pagos. A taxa do Mercado Pago é cobrada por pedido e aparece em Finanças.
      </p>

      {missing > 0 && (
        <div className="mb-6 border border-sand/50 bg-sand/10 px-4 py-3 text-xs text-sand">
          {missing} produto(s) estão sem custo cadastrado (sem insumos na ficha técnica e sem mão de obra). Para eles a margem aparece como 100% e
          não é real: preencha em Produtos para ver o lucro de verdade.
        </div>
      )}

      <div className="mb-6 border border-mist p-5">
        <p className="label-caps text-[11px] text-graphite">Lucro estimado das vendas pagas</p>
        <p className="font-display mt-2 text-2xl">{formatPrice(totalProfit)}</p>
      </div>

      <div className="overflow-x-auto border border-mist">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-mist text-[11px] uppercase tracking-wide text-graphite">
            <tr>
              <th className="px-3 py-3">Produto</th>
              <th className="px-3 py-3 text-right">Preço</th>
              <th className="px-3 py-3 text-right">Custo</th>
              <th className="px-3 py-3 text-right">Margem</th>
              <th className="px-3 py-3 text-right">Margem no Pix</th>
              <th className="px-3 py-3 text-right">Vendidos</th>
              <th className="px-3 py-3 text-right">Lucro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {rows.map((r) => (
              <tr key={r.slug}>
                <td className="px-3 py-3">
                  <p>{r.name}</p>
                  <p className="text-xs text-graphite">
                    {r.categoryName}
                    {r.missingCost ? " · sem custo cadastrado" : `  · insumos ${formatPrice(r.materialCost)} + mão de obra ${formatPrice(r.laborCost)}`}
                  </p>
                </td>
                <td className="px-3 py-3 text-right">{r.price !== null ? formatPrice(r.price) : "Sob consulta"}</td>
                <td className="px-3 py-3 text-right">{formatPrice(r.unitCost)}</td>
                <td className={`px-3 py-3 text-right ${r.margin !== null && r.margin < 0 ? "text-red-500" : ""}`}>
                  {r.margin !== null ? `${formatPrice(r.margin)} (${r.marginPct?.toFixed(0)}%)` : "-"}
                </td>
                <td className={`px-3 py-3 text-right ${r.pixMargin !== null && r.pixMargin < 0 ? "text-red-500" : ""}`}>
                  {r.pixMargin !== null ? formatPrice(r.pixMargin) : "-"}
                </td>
                <td className="px-3 py-3 text-right">{r.unitsSold}</td>
                <td className="px-3 py-3 text-right font-medium">{formatPrice(r.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
