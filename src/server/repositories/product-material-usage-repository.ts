import { db } from "../db";
import type { ProductMaterialUsageWithMaterial } from "../types";
import type { Prisma } from "@/generated/prisma/client";

type UsageRow = Prisma.ProductMaterialUsageGetPayload<{ include: { rawMaterial: true } }>;

function toUsageWithMaterial(row: UsageRow): ProductMaterialUsageWithMaterial {
  return {
    id: row.id,
    productSlug: row.productSlug,
    rawMaterialId: row.rawMaterialId,
    quantity: row.quantity,
    rawMaterialName: row.rawMaterial.name,
    rawMaterialUnit: row.rawMaterial.unit,
    rawMaterialCostPerUnit: row.rawMaterial.costPerUnit,
  };
}

export async function getUsagesForProduct(slug: string): Promise<ProductMaterialUsageWithMaterial[]> {
  const rows = await db.productMaterialUsage.findMany({
    where: { productSlug: slug },
    include: { rawMaterial: true },
  });
  return rows.map(toUsageWithMaterial);
}

export type SetUsageInput = { rawMaterialId: string; quantity: number };

export async function setUsagesForProduct(slug: string, usages: SetUsageInput[]): Promise<void> {
  await db.$transaction([
    db.productMaterialUsage.deleteMany({ where: { productSlug: slug } }),
    db.productMaterialUsage.createMany({
      data: usages.map((usage) => ({
        productSlug: slug,
        rawMaterialId: usage.rawMaterialId,
        quantity: usage.quantity,
      })),
    }),
  ]);
}

export async function computeMaterialCost(slug: string): Promise<number> {
  const usages = await getUsagesForProduct(slug);
  return usages.reduce((sum, usage) => sum + usage.quantity * usage.rawMaterialCostPerUnit, 0);
}
