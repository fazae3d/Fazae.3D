import { db } from "../db";
import type { RawMaterial } from "../types";
import type { Prisma } from "@/generated/prisma/client";

type RawMaterialRow = Prisma.RawMaterialGetPayload<object>;

function toRawMaterial(row: RawMaterialRow): RawMaterial {
  return {
    ...row,
    minStock: row.minStock ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getAllRawMaterials(): Promise<RawMaterial[]> {
  const rows = await db.rawMaterial.findMany({ orderBy: { name: "asc" } });
  return rows.map(toRawMaterial);
}

export async function getRawMaterial(id: string): Promise<RawMaterial | undefined> {
  if (!id) return undefined;
  const row = await db.rawMaterial.findUnique({ where: { id } });
  return row ? toRawMaterial(row) : undefined;
}

export type RawMaterialInput = {
  name: string;
  unit: string;
  stock: number;
  costPerUnit: number;
  minStock?: number;
};

export async function createRawMaterial(input: RawMaterialInput): Promise<RawMaterial> {
  const created = await db.rawMaterial.create({ data: input });
  return toRawMaterial(created);
}

export async function updateRawMaterial(
  id: string,
  input: Partial<RawMaterialInput>,
): Promise<RawMaterial | null> {
  const existing = await db.rawMaterial.findUnique({ where: { id } });
  if (!existing) return null;
  const updated = await db.rawMaterial.update({ where: { id }, data: input });
  return toRawMaterial(updated);
}

export type DeleteRawMaterialResult = { success: true } | { success: false; error: string };

export async function deleteRawMaterial(id: string): Promise<DeleteRawMaterialResult> {
  const existing = await db.rawMaterial.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Insumo não encontrado." };
  await db.rawMaterial.delete({ where: { id } });
  return { success: true };
}

/**
 * A negative resulting stock is allowed on purpose — it's a useful "you're
 * out of material" signal for the admin, not an error condition to block.
 */
export async function adjustRawMaterialStock(id: string, delta: number): Promise<RawMaterial | null> {
  const existing = await db.rawMaterial.findUnique({ where: { id } });
  if (!existing) return null;
  const updated = await db.rawMaterial.update({ where: { id }, data: { stock: { increment: delta } } });
  return toRawMaterial(updated);
}
