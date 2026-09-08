import { db } from "../db";
import { formatPrice } from "@/lib/format";
import type { Coupon, CouponType } from "../types";
import type { Prisma } from "@/generated/prisma/client";

export type { Coupon, CouponType } from "../types";

type CouponRow = Prisma.CouponGetPayload<object>;

function toCoupon(row: CouponRow): Coupon {
  return {
    ...row,
    type: row.type as CouponType,
    minSubtotal: row.minSubtotal ?? undefined,
    usageLimit: row.usageLimit ?? undefined,
  };
}

export async function getAllCoupons(): Promise<Coupon[]> {
  const rows = await db.coupon.findMany();
  return rows.map(toCoupon);
}

export type CouponValidationResult =
  | { valid: true; code: string; type: CouponType; value: number }
  | { valid: false; message: string };

export async function findCoupon(code: string): Promise<Coupon | undefined> {
  const row = await db.coupon.findFirst({ where: { code: { equals: code, mode: "insensitive" } } });
  return row ? toCoupon(row) : undefined;
}

export async function validateCoupon(code: string, subtotal: number): Promise<CouponValidationResult> {
  const coupon = await findCoupon(code);

  if (!coupon || !coupon.active) {
    return { valid: false, message: "Cupom inválido ou expirado." };
  }
  if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
    return { valid: false, message: "Este cupom já atingiu o limite de uso." };
  }
  if (coupon.minSubtotal && subtotal < coupon.minSubtotal) {
    return { valid: false, message: `Este cupom exige um subtotal mínimo de ${formatPrice(coupon.minSubtotal)}.` };
  }

  return { valid: true, code: coupon.code, type: coupon.type, value: coupon.value };
}

export async function registerCouponUsage(code: string): Promise<void> {
  const coupon = await findCoupon(code);
  if (coupon) {
    await db.coupon.update({ where: { code: coupon.code }, data: { usageCount: { increment: 1 } } });
  }
}

export type CouponMutationResult = { success: true; coupon: Coupon } | { success: false; error: string };

export async function createCoupon(input: Omit<Coupon, "usageCount">): Promise<CouponMutationResult> {
  if (await findCoupon(input.code)) {
    return { success: false, error: "Já existe um cupom com esse código." };
  }
  const created = await db.coupon.create({ data: { ...input, usageCount: 0 } });
  return { success: true, coupon: toCoupon(created) };
}

export async function updateCoupon(
  code: string,
  input: Partial<Omit<Coupon, "code" | "usageCount">>,
): Promise<CouponMutationResult> {
  const existing = await findCoupon(code);
  if (!existing) return { success: false, error: "Cupom não encontrado." };
  const updated = await db.coupon.update({ where: { code: existing.code }, data: input });
  return { success: true, coupon: toCoupon(updated) };
}

export type DeleteCouponResult = { success: true } | { success: false; error: string };

export async function deleteCoupon(code: string): Promise<DeleteCouponResult> {
  const existing = await findCoupon(code);
  if (!existing) return { success: false, error: "Cupom não encontrado." };
  await db.coupon.delete({ where: { code: existing.code } });
  return { success: true };
}
