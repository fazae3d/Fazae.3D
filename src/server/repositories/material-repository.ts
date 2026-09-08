import { db } from "../db";
import type { Material } from "@/lib/types";
import type { Prisma } from "@/generated/prisma/client";

type MaterialRow = Prisma.MaterialGetPayload<object>;

function toMaterial(row: MaterialRow): Material {
  return { ...row, colors: row.colors as Material["colors"] };
}

export async function getAllMaterials(): Promise<Material[]> {
  const rows = await db.material.findMany({ orderBy: { name: "asc" } });
  return rows.map(toMaterial);
}

export async function getMaterial(slug: string): Promise<Material | undefined> {
  if (!slug) return undefined;
  const row = await db.material.findUnique({ where: { slug } });
  return row ? toMaterial(row) : undefined;
}

export type MaterialInput = Material;

export async function createMaterial(input: MaterialInput): Promise<Material> {
  const existing = await getMaterial(input.slug);
  if (existing) {
    throw new Error("Já existe um material com esse slug.");
  }
  const created = await db.material.create({
    data: { ...input, colors: input.colors as unknown as Prisma.InputJsonValue },
  });
  return toMaterial(created);
}

export async function updateMaterial(
  slug: string,
  input: Partial<Omit<Material, "slug">>,
): Promise<Material | null> {
  const existing = await getMaterial(slug);
  if (!existing) return null;
  const updated = await db.material.update({
    where: { slug },
    data: { ...input, colors: input.colors as unknown as Prisma.InputJsonValue | undefined },
  });
  return toMaterial(updated);
}

export async function deleteMaterial(slug: string): Promise<void> {
  await db.material.delete({ where: { slug } });
}
