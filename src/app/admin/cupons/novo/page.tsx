import { CouponForm } from "@/components/admin/coupon-form";
import { createCouponAction } from "../actions";

export default function NewCouponPage() {
  return (
    <div className="max-w-xl">
      <h1 className="font-display mb-8 text-2xl sm:text-3xl">Novo cupom</h1>
      <CouponForm action={createCouponAction} />
    </div>
  );
}
