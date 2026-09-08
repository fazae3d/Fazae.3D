import { db } from "../db";
import type { CustomOrderRequest, CustomRequestStatus } from "@/lib/types";
import type { Prisma } from "@/generated/prisma/client";
import { upsertCustomerFromContact } from "./customer-repository";

type Row = Prisma.CustomOrderRequestGetPayload<object>;

function toRequest(row: Row): CustomOrderRequest {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    status: row.status as CustomRequestStatus,
    email: row.email ?? undefined,
    referenceProductSlug: row.referenceProductSlug ?? undefined,
    referenceFileUrl: row.referenceFileUrl ?? undefined,
    materialPreference: row.materialPreference ?? undefined,
    colorPreference: row.colorPreference ?? undefined,
    desiredDeadline: row.desiredDeadline ?? undefined,
    adminNotes: row.adminNotes ?? undefined,
    linkedOrderId: row.linkedOrderId ?? undefined,
  };
}

export type CreateCustomOrderRequestInput = Omit<
  CustomOrderRequest,
  "id" | "createdAt" | "status" | "adminNotes" | "linkedOrderId"
>;

export async function createCustomOrderRequest(
  input: CreateCustomOrderRequestInput,
): Promise<CustomOrderRequest> {
  const created = await db.customOrderRequest.create({ data: input });
  await upsertCustomerFromContact({ name: input.name, phone: input.phone, email: input.email });
  return toRequest(created);
}

export async function getAllCustomOrderRequests(): Promise<CustomOrderRequest[]> {
  const rows = await db.customOrderRequest.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toRequest);
}

export async function getCustomOrderRequest(id: string): Promise<CustomOrderRequest | undefined> {
  const row = await db.customOrderRequest.findUnique({ where: { id } });
  return row ? toRequest(row) : undefined;
}

export async function updateCustomOrderRequest(
  id: string,
  input: Partial<Pick<CustomOrderRequest, "status" | "adminNotes" | "linkedOrderId">>,
): Promise<CustomOrderRequest | null> {
  const existing = await db.customOrderRequest.findUnique({ where: { id } });
  if (!existing) return null;
  const updated = await db.customOrderRequest.update({ where: { id }, data: input });
  return toRequest(updated);
}
