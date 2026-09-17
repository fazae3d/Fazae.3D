import { db } from "../db";
import type {
  Consignee,
  ConsigneeDetail,
  ConsigneeWithSummary,
  ConsignmentItem,
  ConsignmentVisit,
} from "../types";
import type { Prisma } from "@/generated/prisma/client";
import { round2 } from "@/lib/money";

type ConsigneeRow = Prisma.ConsigneeGetPayload<object>;
type ConsignmentItemRow = Prisma.ConsignmentItemGetPayload<object>;
type ConsignmentVisitRow = Prisma.ConsignmentVisitGetPayload<object>;

function toConsignee(row: ConsigneeRow): Consignee {
  return {
    ...row,
    email: row.email ?? undefined,
    street: row.street ?? undefined,
    number: row.number ?? undefined,
    complement: row.complement ?? undefined,
    neighborhood: row.neighborhood ?? undefined,
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    zip: row.zip ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function toConsignmentItem(row: ConsignmentItemRow): ConsignmentItem {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toConsignmentVisit(row: ConsignmentVisitRow): ConsignmentVisit {
  return {
    ...row,
    visitDate: row.visitDate.toISOString(),
    nextVisitDate: row.nextVisitDate?.toISOString() ?? undefined,
    amountCollected: row.amountCollected,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getAllConsigneesWithSummary(): Promise<ConsigneeWithSummary[]> {
  const rows = await db.consignee.findMany({
    orderBy: { name: "asc" },
    include: {
      items: true,
      visits: { orderBy: { visitDate: "desc" }, take: 1 },
    },
  });

  return rows.map((row) => {
    const consignee = toConsignee(row);
    const totalItems = row.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalValueOpen = round2(row.items.reduce((sum, item) => sum + item.quantity * item.consignedPrice, 0));
    const nextVisitDate = row.visits[0]?.nextVisitDate?.toISOString() ?? undefined;
    return { ...consignee, totalItems, totalValueOpen, nextVisitDate };
  });
}

export async function getConsigneeById(id: string): Promise<ConsigneeDetail | undefined> {
  if (!id) return undefined;
  const row = await db.consignee.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
      visits: { orderBy: { visitDate: "desc" } },
    },
  });
  if (!row) return undefined;

  return {
    consignee: toConsignee(row),
    items: row.items.map((item) => ({ ...toConsignmentItem(item), productName: item.product.name })),
    visits: row.visits.map(toConsignmentVisit),
  };
}

export type ConsigneeInput = {
  name: string;
  document: string;
  phone: string;
  email?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
  active?: boolean;
};

export async function createConsignee(input: ConsigneeInput): Promise<Consignee> {
  const created = await db.consignee.create({ data: input });
  return toConsignee(created);
}

export async function updateConsignee(id: string, input: Partial<ConsigneeInput>): Promise<Consignee | null> {
  const existing = await db.consignee.findUnique({ where: { id } });
  if (!existing) return null;
  const updated = await db.consignee.update({ where: { id }, data: input });
  return toConsignee(updated);
}

export async function deleteConsignee(id: string): Promise<void> {
  await db.consignee.delete({ where: { id } });
}

export async function getConsignmentItem(
  consigneeId: string,
  productSlug: string,
): Promise<ConsignmentItem | undefined> {
  const row = await db.consignmentItem.findUnique({
    where: { consigneeId_productSlug: { consigneeId, productSlug } },
  });
  return row ? toConsignmentItem(row) : undefined;
}

/** Registra uma entrega: soma `quantity` ao saldo existente (ou cria a linha) e atualiza o preço combinado. */
export async function deliverConsignmentItem(input: {
  consigneeId: string;
  productSlug: string;
  consignedPrice: number;
  quantity: number;
}): Promise<ConsignmentItem> {
  const upserted = await db.consignmentItem.upsert({
    where: { consigneeId_productSlug: { consigneeId: input.consigneeId, productSlug: input.productSlug } },
    create: {
      consigneeId: input.consigneeId,
      productSlug: input.productSlug,
      consignedPrice: input.consignedPrice,
      quantity: input.quantity,
    },
    update: {
      consignedPrice: input.consignedPrice,
      quantity: { increment: input.quantity },
    },
  });
  return toConsignmentItem(upserted);
}

/** Baixa do saldo atual (venda confirmada e/ou devolução) — `delta` deve ser negativo. */
export async function adjustConsignmentItemQuantity(
  consigneeId: string,
  productSlug: string,
  delta: number,
): Promise<ConsignmentItem> {
  const updated = await db.consignmentItem.update({
    where: { consigneeId_productSlug: { consigneeId, productSlug } },
    data: { quantity: { increment: delta } },
  });
  return toConsignmentItem(updated);
}

export type ConsignmentVisitInput = {
  consigneeId: string;
  visitDate: Date;
  nextVisitDate?: Date;
  amountCollected: number;
  notes?: string;
};

export async function createConsignmentVisit(input: ConsignmentVisitInput): Promise<ConsignmentVisit> {
  const created = await db.consignmentVisit.create({ data: input });
  return toConsignmentVisit(created);
}
