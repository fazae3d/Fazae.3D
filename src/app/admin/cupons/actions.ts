"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { couponFormSchema, type CouponFormInput } from "@/lib/admin-validation";
import {
  createCoupon,
  deleteCoupon,
  updateCoupon,
  type CouponMutationResult,
  type DeleteCouponResult,
} from "@/server/repositories/coupon-repository";
import { withMutationFallback } from "@/lib/db-fallback";

async function requireAdmin() {
  if (ADMIN_AUTH_DISABLED) return true;
  const session = await auth();
  return session?.user?.role === "admin";
}

function toStoredCoupon(input: CouponFormInput) {
  return {
    code: input.code,
    type: input.type,
    value: input.type === "frete-gratis" ? 0 : input.value,
    minSubtotal: input.minSubtotal === "" || input.minSubtotal === undefined ? undefined : Number(input.minSubtotal),
    usageLimit: input.usageLimit === "" || input.usageLimit === undefined ? undefined : Number(input.usageLimit),
    active: input.active,
  };
}

export async function createCouponAction(input: CouponFormInput): Promise<CouponMutationResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const parsed = couponFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco — hoje a escrita real falharia sem Supabase configurado.
  const result = await withMutationFallback(() => createCoupon(toStoredCoupon(parsed.data)));
  if (result.success) revalidatePath("/admin/cupons");
  return result;
}

export async function updateCouponAction(code: string, input: CouponFormInput): Promise<CouponMutationResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const parsed = couponFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const stored = toStoredCoupon(parsed.data);
  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco — hoje a escrita real falharia sem Supabase configurado.
  const result = await withMutationFallback(() =>
    updateCoupon(code, {
      type: stored.type,
      value: stored.value,
      minSubtotal: stored.minSubtotal,
      usageLimit: stored.usageLimit,
      active: stored.active,
    }),
  );
  if (result.success) revalidatePath("/admin/cupons");
  return result;
}

export async function deleteCouponAction(code: string): Promise<DeleteCouponResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco — hoje a escrita real falharia sem Supabase configurado.
  const result = await withMutationFallback(() => deleteCoupon(code));
  if (result.success) revalidatePath("/admin/cupons");
  return result;
}
