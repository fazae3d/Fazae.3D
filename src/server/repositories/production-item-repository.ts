import { db } from "../db";
import type { ProductionItem } from "../types";
import type { Prisma } from "@/generated/prisma/client";

type ProductionItemRow = Prisma.ProductionItemGetPayload<object>;

function toProductionItem(row: ProductionItemRow): ProductionItem {
  return {
    ...row,
    productSlug: row.productSlug ?? undefined,
    stage: row.stage as ProductionItem["stage"],
    deadline: row.deadline?.toISOString() ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getAllProductionItems(): Promise<ProductionItem[]> {
  const rows = await db.productionItem.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toProductionItem);
}

export async function getProductionItem(id: string): Promise<ProductionItem | undefined> {
  const row = await db.productionItem.findUnique({ where: { id } });
  return row ? toProductionItem(row) : undefined;
}

export type ProductionItemInput = {
  productSlug?: string;
  description: string;
  quantity: number;
  deadline?: Date;
  notes?: string;
};

export async function createProductionItem(input: ProductionItemInput): Promise<ProductionItem> {
  const created = await db.productionItem.create({ data: input });
  return toProductionItem(created);
}

export type ProductionItemUpdateInput = {
  stage?: ProductionItem["stage"];
  deadline?: Date | null;
  quantity?: number;
  notes?: string;
};

export async function updateProductionItem(
  id: string,
  input: ProductionItemUpdateInput,
): Promise<ProductionItem | null> {
  const existing = await db.productionItem.findUnique({ where: { id } });
  if (!existing) return null;

  // Item ligado a um produto do catálogo: ao ser finalizado, as unidades entram no estoque (uma vez só); se voltar para uma
  // fase anterior, saem de novo. `stockAddedQty` guarda quantas unidades já foram somadas, para nunca contar em dobro.
  const updated = await db.$transaction(async (tx) => {
    const quantity = input.quantity ?? existing.quantity;
    let stockAddedQty = existing.stockAddedQty;
    if (input.stage && existing.productSlug) {
      if (input.stage === "finalizado" && existing.stockAddedQty === 0) {
        await tx.product.update({ where: { slug: existing.productSlug }, data: { stock: { increment: quantity } } });
        stockAddedQty = quantity;
      } else if (input.stage !== "finalizado" && existing.stockAddedQty > 0) {
        const current = await tx.product.findUnique({ where: { slug: existing.productSlug }, select: { stock: true } });
        const remove = Math.min(existing.stockAddedQty, current?.stock ?? 0);
        if (remove > 0) await tx.product.update({ where: { slug: existing.productSlug }, data: { stock: { decrement: remove } } });
        stockAddedQty = 0;
      }
    }
    return tx.productionItem.update({ where: { id }, data: { ...input, stockAddedQty } });
  });
  return toProductionItem(updated);
}

export async function deleteProductionItem(id: string): Promise<void> {
  await db.productionItem.delete({ where: { id } });
}
