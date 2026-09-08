import Link from "next/link";
import { getAllCoupons } from "@/server/repositories/coupon-repository";
import { DeleteCouponButton } from "@/components/admin/delete-coupon-button";
import { formatPrice } from "@/lib/format";
import type { CouponType } from "@/server/types";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackCoupons } from "@/server/demo-fallback";

const TYPE_LABELS: Record<CouponType, string> = {
  percentual: "Percentual",
  fixo: "Valor fixo",
  "frete-gratis": "Frete grátis",
};

function formatValue(type: CouponType, value: number) {
  if (type === "percentual") return `${value}%`;
  if (type === "fixo") return formatPrice(value);
  return "";
}

export default async function AdminCouponsPage() {
  const coupons = await withReadFallback(() => getAllCoupons(), fallbackCoupons);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl sm:text-3xl">Cupons</h1>
        <Link
          href="/admin/cupons/novo"
          className="label-caps border border-ink px-5 py-3 text-xs transition-colors hover:bg-ink hover:text-paper"
        >
          Novo cupom
        </Link>
      </div>

      {coupons.length === 0 ? (
        <div className="border border-mist px-6 py-16 text-center text-graphite">Nenhum cupom criado ainda.</div>
      ) : (
        <div className="overflow-x-auto border border-mist">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-mist bg-mist/30">
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Código</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Tipo</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Valor</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Subtotal mínimo</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Usos</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Status</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {coupons.map((coupon) => (
                <tr key={coupon.code}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/cupons/${coupon.code}`} className="hover:text-petrol">
                      {coupon.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-graphite">{TYPE_LABELS[coupon.type]}</td>
                  <td className="px-4 py-3">{formatValue(coupon.type, coupon.value)}</td>
                  <td className="px-4 py-3 text-graphite">
                    {coupon.minSubtotal ? formatPrice(coupon.minSubtotal) : "Sem mínimo"}
                  </td>
                  <td className="px-4 py-3 text-graphite">
                    {coupon.usageCount}
                    {coupon.usageLimit ? ` / ${coupon.usageLimit}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    {coupon.active ? (
                      <span className="label-caps text-[10px] text-petrol">Ativo</span>
                    ) : (
                      <span className="label-caps text-[10px] text-graphite">Inativo</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/cupons/${coupon.code}`}
                        className="label-caps text-[11px] text-graphite hover:text-petrol"
                      >
                        Editar
                      </Link>
                      <DeleteCouponButton code={coupon.code} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
