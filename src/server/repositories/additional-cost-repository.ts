import { db } from "../db";
import type { AdditionalCost } from "../types";

export async function getAllAdditionalCosts(): Promise<AdditionalCost[]> {
  return db.additionalCost.findMany({ orderBy: { name: "asc" } });
}

export async function createAdditionalCost(input: { name: string; value: number }): Promise<AdditionalCost> {
  return db.additionalCost.create({ data: input });
}

export type DeleteAdditionalCostResult = { success: true } | { success: false; error: string };

export async function deleteAdditionalCost(id: string): Promise<DeleteAdditionalCostResult> {
  const existing = await db.additionalCost.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Custo não encontrado." };
  await db.additionalCost.delete({ where: { id } });
  return { success: true };
}
