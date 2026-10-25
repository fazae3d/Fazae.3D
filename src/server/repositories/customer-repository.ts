import { db } from "../db";
import type { Customer, CustomerWithStats, Order } from "../types";
import type { CustomOrderRequest } from "@/lib/types";
import type { Prisma } from "@/generated/prisma/client";
import { round2 } from "@/lib/money";
import { buildCustomerMetrics, phoneKey, type CustomerMetrics } from "@/lib/customer-insights";
import { isCustomerSource } from "@/lib/customer-source";
import { normalizePhone } from "@/lib/whatsapp";

type CustomerRow = Prisma.CustomerGetPayload<object>;

function toCustomer(row: CustomerRow): Customer {
  return {
    ...row,
    email: row.email ?? undefined,
    notes: row.notes ?? undefined,
    source: row.source ?? undefined,
    createdAt: row.createdAt.toISOString(),
    lastReminderAt: row.lastReminderAt?.toISOString(),
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
    shippingMethod: row.shippingMethod ?? undefined,
    paymentFee: row.paymentFee ?? undefined,
    tracking: row.tracking ?? undefined,
    paymentMethod: row.paymentMethod as Order["paymentMethod"],
    paymentStatus: row.paymentStatus as Order["paymentStatus"],
    mpPaymentId: row.mpPaymentId ?? undefined,
    status: row.status as Order["status"],
    items: row.items as Order["items"],
    address: (row.address as Order["address"]) ?? undefined,
    productionStage: row.productionStage as Order["productionStage"],
    productionDeadline: row.productionDeadline?.toISOString() ?? undefined,
    depositAmount: row.depositAmount,
    deliveredAt: row.deliveredAt?.toISOString(),
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
 * Order in a single query (matched by phone), avoids an N+1 query per row.
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

export type UpsertCustomerContactInput = { name: string; phone: string; email?: string; source?: string };

/**
 * Upsert by phone (the unique CRM key). Existing name/email edited by the
 * admin are never clobbered by blank or lower-quality data coming in from a
 * new order/request, only fills in what's currently empty.
 */
export async function upsertCustomerFromContact(input: UpsertCustomerContactInput): Promise<Customer> {
  // O mesmo número escrito de formas diferentes ("(84) 99999-8888", "84999998888", "5584999998888") é o mesmo cliente.
  const key = phoneKey(input.phone);
  const existing =
    (await db.customer.findUnique({ where: { phone: input.phone } })) ??
    (key ? (await db.customer.findMany({ select: { id: true, phone: true } })).find((c) => phoneKey(c.phone) === key) : undefined);
  const source = isCustomerSource(input.source) ? input.source : undefined;

  if (existing) {
    const current = await db.customer.findUnique({ where: { id: existing.id } });
    const patch: Prisma.CustomerUpdateInput = {};
    if (!current?.name && input.name) patch.name = input.name;
    if (!current?.email && input.email) patch.email = input.email;
    if (!current?.source && source) patch.source = source;
    const row = Object.keys(patch).length > 0 ? await db.customer.update({ where: { id: existing.id }, data: patch }) : current;
    return toCustomer(row!);
  }

  // Cliente novo: guarda o telefone no formato padrão (55 + DDD + número) quando ele é válido.
  const created = await db.customer.create({
    data: { name: input.name, phone: normalizePhone(input.phone) ?? input.phone, email: input.email, source },
  });
  return toCustomer(created);
}

export type UnidentifiedOrder = { id: string; customerName: string; total: number; createdAt: string; channel: string };

/** Pedidos de balcão ou WhatsApp sem telefone (não são do site, que já guarda o e-mail): ficam fora do CRM até alguém identificar o cliente. */
export async function getUnidentifiedOrders(): Promise<UnidentifiedOrder[]> {
  const rows = await db.order.findMany({
    where: { status: { not: "Cancelado" }, channel: { not: "online" }, OR: [{ customerPhone: null }, { customerPhone: "" }] },
    select: { id: true, customerName: true, total: true, createdAt: true, channel: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({ id: r.id, customerName: (r.customerName ?? "").trim(), total: r.total, createdAt: r.createdAt.toISOString(), channel: r.channel }));
}

/** Põe o telefone nos pedidos que não tinham (só os que ainda estão sem) e cadastra o cliente. Devolve quantos pedidos foram atualizados. */
export async function identifyOrdersCustomer(input: { orderIds: string[]; name: string; phone: string; source?: string }): Promise<{ updated: number; customer: Customer }> {
  const phone = normalizePhone(input.phone);
  if (!phone) throw new Error("Telefone inválido.");
  const customer = await upsertCustomerFromContact({ name: input.name, phone, source: input.source });
  const result = await db.order.updateMany({
    where: { id: { in: input.orderIds }, OR: [{ customerPhone: null }, { customerPhone: "" }] },
    data: { customerPhone: phone },
  });
  return { updated: result.count, customer };
}

/** Procura o cliente pelo telefone, em qualquer formato de escrita. */
export async function findCustomerByPhone(phone: string): Promise<Customer | undefined> {
  const key = phoneKey(phone);
  if (!key) return undefined;
  const rows = await db.customer.findMany();
  const row = rows.find((c) => phoneKey(c.phone) === key);
  return row ? toCustomer(row) : undefined;
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

export async function markCustomerReminded(id: string): Promise<void> {
  await db.customer.update({ where: { id }, data: { lastReminderAt: new Date() } });
}

export type CustomerWithMetrics = Customer & { metrics: CustomerMetrics };

/** Todos os clientes com compras, última compra e ticket médio (uma consulta de clientes + uma de pedidos). */
export async function getCustomersWithMetrics(): Promise<CustomerWithMetrics[]> {
  const [rows, orderRows] = await Promise.all([
    db.customer.findMany({ orderBy: { name: "asc" } }),
    db.order.findMany({ select: { status: true, channel: true, total: true, createdAt: true, customerPhone: true, userEmail: true } }),
  ]);
  const customers = rows.map(toCustomer);
  const metrics = buildCustomerMetrics(
    customers,
    orderRows.map((o) => ({ ...o, channel: o.channel as Order["channel"], status: o.status as Order["status"], createdAt: o.createdAt.toISOString(), customerPhone: o.customerPhone ?? undefined, userEmail: o.userEmail ?? undefined })),
  );
  return customers.map((c) => ({ ...c, metrics: metrics.get(c.id) ?? { orderCount: 0, totalSpent: 0, averageTicket: 0 } }));
}
