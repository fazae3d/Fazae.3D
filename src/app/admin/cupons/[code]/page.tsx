import { notFound } from "next/navigation";
import { findCoupon } from "@/server/repositories/coupon-repository";
import { CouponForm } from "@/components/admin/coupon-form";
import { updateCouponAction } from "../actions";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackCoupons } from "@/server/demo-fallback";

export default async function EditCouponPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const coupon = await withReadFallback(
    () => findCoupon(code),
    fallbackCoupons.find((c) => c.code.toLowerCase() === code.toLowerCase()),
  );
  if (!coupon) notFound();

  const boundAction = updateCouponAction.bind(null, coupon.code);

  return (
    <div className="max-w-xl">
      <h1 className="font-display mb-8 text-2xl sm:text-3xl">Editar cupom</h1>
      <CouponForm coupon={coupon} action={boundAction} />
    </div>
  );
}
