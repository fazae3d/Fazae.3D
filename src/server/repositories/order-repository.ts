import { db } from "../db";
import type { Order, OrderStatus } from "../types";
import type { Prisma, ProductionStage } from "@/generated/prisma/client";
import { getUsagesForProduct } from "./product-material-usage-repository";
import { adjustRawMaterialStock } from "./raw-material-repository";
import { upsertCustomerFromContact } from "./customer-repository";

export type { Order, OrderItem, OrderStatus, PaymentMethod } from "../types";

type OrderRow = Prisma.OrderGetPayload<object>;

function toOrder(row: OrderRow): Order {
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
    paymentStatus: row.paymentStatus as Order["paymentStatus"],
    mpPaymentId: row.mpPaymentId ?? undefined,
    status: row.status as Order["status"],
    items: row.items as Order["items"],
    address: (row.address as Order["address"]) ?? undefined,
    productionStage: row.productionStage as Order["productionStage"],
    productionDeadline: row.productionDeadline?.toISOString() ?? undefined,
    depositAmount: row.depositAmount,
  };
}

/**
 * Decrements RawMaterial stock per the BOM of each item sold. A negative
 * resulting stock is allowed on purpose — it's a useful "you're out of
 * material" signal for the admin, never a reason to block the sale.
 */
async function consumeRawMaterialsForOrder(order: Order): Promise<void> {
  for (const item of order.items) {
    const usages = await getUsagesForProduct(item.productSlug);
    for (const usage of usages) {
      await adjustRawMaterialStock(usage.rawMaterialId, -(usage.quantity * item.quantity));
    }
  }
}

async function determineProductionStage(order: Order): Promise<ProductionStage> {
  const products = await db.product.findMany({
    where: { slug: { in: order.items.map((item) => item.productSlug) } },
  });
  const bySlug = new Map(products.map((product) => [product.slug, product]));

  const needsProduction = order.items.some((item) => {
    const product = bySlug.get(item.productSlug);
    if (!product) return false;
    return product.type === "sob_encomenda" || product.stock < item.quantity;
  });

  return needsProduction ? "inicio" : "nao_aplicavel";
}

export async function addOrder(order: Order): Promise<Order> {
  const { createdAt, address, ...rest } = order;
  const productionStage = await determineProductionStage(order);
  const created = await db.order.create({
    data: {
      ...rest,
      createdAt: new Date(createdAt),
      items: rest.items as unknown as Prisma.InputJsonValue,
      address: address ? (address as unknown as Prisma.InputJsonValue) : undefined,
      productionStage,
    },
  });

  await consumeRawMaterialsForOrder(order);
  if (order.customerPhone) {
    await upsertCustomerFromContact({
      name: order.customerName ?? "",
      phone: order.customerPhone,
      email: order.userEmail,
    });
  }

  return toOrder(created);
}

export async function getAllOrders(): Promise<Order[]> {
  const rows = await db.order.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toOrder);
}

export async function findOrdersByEmail(email: string): Promise<Order[]> {
  const rows = await db.order.findMany({
    where: { userEmail: { equals: email, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toOrder);
}

export async function findOrderById(id: string): Promise<Order | undefined> {
  if (!id) return undefined;
  const row = await db.order.findUnique({ where: { id } });
  return row ? toOrder(row) : undefined;
}

export type UpdateOrderResult = { success: true; order: Order } | { success: false; error: string };

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  tracking?: string,
): Promise<UpdateOrderResult> {
  const existing = await db.order.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Pedido não encontrado." };
  const updated = await db.order.update({
    where: { id },
    data: { status, ...(tracking !== undefined ? { tracking: tracking || null } : {}) },
  });
  return { success: true, order: toOrder(updated) };
}

/**
 * Reconciles a Mercado Pago webhook notification with the order it belongs
 * to — looked up by `mpPaymentId` (set at order-creation time from the
 * gateway's synchronous response), never trusted from the webhook body itself.
 */
export async function updateOrderPaymentStatus(
  mpPaymentId: string,
  data: { paymentStatus: string; status?: OrderStatus },
): Promise<UpdateOrderResult> {
  const existing = await db.order.findUnique({ where: { mpPaymentId } });
  if (!existing) return { success: false, error: "Pedido não encontrado para esse pagamento." };
  const updated = await db.order.update({
    where: { mpPaymentId },
    data: { paymentStatus: data.paymentStatus, ...(data.status ? { status: data.status } : {}) },
  });
  return { success: true, order: toOrder(updated) };
}

export async function updateOrderProduction(
  id: string,
  data: { stage?: ProductionStage; deadline?: Date | null; depositAmount?: number },
): Promise<UpdateOrderResult> {
  const existing = await db.order.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Pedido não encontrado." };
  const updated = await db.order.update({
    where: { id },
    data: {
      ...(data.stage !== undefined ? { productionStage: data.stage } : {}),
      ...(data.deadline !== undefined ? { productionDeadline: data.deadline } : {}),
      ...(data.depositAmount !== undefined ? { depositAmount: data.depositAmount } : {}),
    },
  });
  return { success: true, order: toOrder(updated) };
}

export function generateOrderId() {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `FAZ-${random}`;
}
