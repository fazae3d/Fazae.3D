import { db } from "../db";
import type { Customer, CustomerWithStats, Order } from "../types";
import type { CustomOrderRequest } from "@/lib/types";
import type { Prisma } from "@/generated/prisma/client";
import { round2 } from "@/lib/money";

type CustomerRow = Prisma.CustomerGetPayload<object>;

function toCustomer(row: CustomerRow): Customer {
  return {
    ...row,
    email: row.email ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function toOrder(row: Prisma.OrderGetPayload<object>): Order {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    channel: row.channel as Order["channel"],
    originRequestId: row.originRequestId ?? undefined,
    userEmail: row.userEmail ?? undefined,
    customerName: row.customerName ?? undefined,
    customerPhone: row.customerPhone ?? undefined,
    couponCode: row.couponCode ?? undefined,
    tracking: row.tracking ?? undefined,
    paymentMethod: row.paymentMethod as Order["paymentMethod"],
    status: row.status as Order["status"],
    items: row.items as Order["items"],
    address: (row.address as Order["address"]) ?? undefined,
    productionStage: row.productionStage as Order["productionStage"],
    productionDeadline: row.productionDeadline?.toISOString() ?? undefined,
    depositAmount: row.depositAmount,
  };
}

function toCustomOrderRequest(row: Prisma.CustomOrderRequestGetPayload<object>): CustomOrderRequest {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    status: row.status as CustomOrderRequest["status"],
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

export async function getAllCustomers(): Promise<Customer[]> {
  const rows = await db.customer.findMany({ orderBy: { name: "asc" } });
  return rows.map(toCustomer);
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  if (!id) return undefined;
  const row = await db.customer.findUnique({ where: { id } });
  return row ? toCustomer(row) : undefined;
}

/**
 * Same list as getAllCustomers, plus orderCount/totalSpent aggregated from
 * Order in a single query (matched by phone) — avoids an N+1 query per row.
 */
export async function getAllCustomersWithStats(): Promise<CustomerWithStats[]> {
  const [rows, orderRows] = await Promise.all([
    db.customer.findMany({ orderBy: { name: "asc" } }),
    db.order.findMany({ select: { customerPhone: true, total: true } }),
  ]);

  const statsByPhone = new Map<string, { orderCount: number; totalSpent: number }>();
  for (const order of orderRows) {
    if (!order.customerPhone) continue;
    const entry = statsByPhone.get(order.customerPhone) ?? { orderCount: 0, totalSpent: 0 };
    entry.orderCount += 1;
    entry.totalSpent += order.total;
    statsByPhone.set(order.customerPhone, entry);
  }

  return rows.map((row) => {
    const customer = toCustomer(row);
    const stats = statsByPhone.get(customer.phone) ?? { orderCount: 0, totalSpent: 0 };
    return { ...customer, orderCount: stats.orderCount, totalSpent: round2(stats.totalSpent) };
  });
}

export type UpsertCustomerContactInput = { name: string; phone: string; email?: string };

/**
 * Upsert by phone (the unique CRM key). Existing name/email edited by the
 * admin are never clobbered by blank or lower-quality data coming in from a
 * new order/request — only fills in what's currently empty.
 */
export async function upsertCustomerFromContact(input: UpsertCustomerContactInput): Promise<Customer> {
  const existing = await db.customer.findUnique({ where: { phone: input.phone } });
  const patch: Prisma.CustomerUpdateInput = {};
  if (!existing?.name && input.name) patch.name = input.name;
  if (!existing?.email && input.email) patch.email = input.email;

  const upserted = await db.customer.upsert({
    where: { phone: input.phone },
    create: { name: input.name, phone: input.phone, email: input.email },
    update: patch,
  });
  return toCustomer(upserted);
}

export async function updateCustomerCrmInfo(
  id: string,
  data: { notes?: string; tags?: string[] },
): Promise<Customer | null> {
  const existing = await db.customer.findUnique({ where: { id } });
  if (!existing) return null;
  const updated = await db.customer.update({ where: { id }, data });
  return toCustomer(updated);
}

export type CustomerActivity = {
  customer: Customer;
  orders: Order[];
  requests: CustomOrderRequest[];
};

export async function getCustomerActivity(id: string): Promise<CustomerActivity | undefined> {
  const customer = await getCustomer(id);
  if (!customer) return undefined;

  const [orderRows, requestRows] = await Promise.all([
    db.order.findMany({ where: { customerPhone: customer.phone }, orderBy: { createdAt: "desc" } }),
    db.customOrderRequest.findMany({ where: { phone: customer.phone }, orderBy: { createdAt: "desc" } }),
  ]);

  return {
    customer,
    orders: orderRows.map(toOrder),
    requests: requestRows.map(toCustomOrderRequest),
  };
}
