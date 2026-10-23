import { round2 } from "@/lib/money";
import { applyManualPayment, receivedAmount } from "@/lib/payment";
import { db } from "../db";
import type { Order, OrderStatus } from "../types";
import type { Prisma, ProductionStage } from "@/generated/prisma/client";
import { getUsagesForProduct } from "./product-material-usage-repository";
import { adjustRawMaterialStock } from "./raw-material-repository";
import { randomInt } from "crypto";
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
    stockReserved: row.stockReserved,
    deliveredAt: row.deliveredAt?.toISOString(),
  };
}

/** Lançada quando o estoque não cobre o pedido no momento da baixa (outra compra levou a última peça). */
export class OutOfStockError extends Error {
  constructor(public productName: string) {
    super(`"${productName}" não tem estoque suficiente disponível.`);
  }
}

/** Cliente dentro de uma transação (é o cliente com auditoria, sem as operações de conexão e transação). */
type Tx = Omit<typeof db, "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use">;

function quantitiesBySlug(items: Order["items"]) {
  const totals = new Map<string, number>();
  for (const item of items) totals.set(item.productSlug, (totals.get(item.productSlug) ?? 0) + item.quantity);
  return totals;
}

/**
 * Baixa o estoque dentro da mesma transação que cria o pedido, de forma atômica:
 * `stock >= qty` na própria condição do UPDATE impede duas compras simultâneas de levarem a mesma peça.
 * Produtos sob encomenda não têm estoque a baixar.
 */
async function reserveStock(tx: Tx, items: Order["items"]) {
  const totals = quantitiesBySlug(items);
  const products = await tx.product.findMany({ where: { slug: { in: [...totals.keys()] } } });
  for (const product of products) {
    if (product.type === "sob_encomenda") continue;
    const qty = totals.get(product.slug) ?? 0;
    const result = await tx.product.updateMany({
      where: { slug: product.slug, stock: { gte: qty } },
      data: { stock: { decrement: qty } },
    });
    if (result.count === 0) throw new OutOfStockError(product.name);
  }
}

/** Devolve estoque e insumos de um pedido que tinha a reserva ativa. Idempotente: só age uma vez por pedido. */
async function releaseReservation(orderId: string): Promise<void> {
  const claimed = await db.order.updateMany({ where: { id: orderId, stockReserved: true }, data: { stockReserved: false } });
  if (claimed.count === 0) return;
  const row = await db.order.findUnique({ where: { id: orderId } });
  if (!row) return;
  const items = row.items as Order["items"];
  const totals = quantitiesBySlug(items);
  const products = await db.product.findMany({ where: { slug: { in: [...totals.keys()] } } });
  for (const product of products) {
    if (product.type === "sob_encomenda") continue;
    await db.product.update({ where: { slug: product.slug }, data: { stock: { increment: totals.get(product.slug) ?? 0 } } });
  }
  for (const item of items) {
    const usages = await getUsagesForProduct(item.productSlug);
    for (const usage of usages) {
      await adjustRawMaterialStock(usage.rawMaterialId, usage.quantity * item.quantity);
    }
  }
}

/**
 * Decrements RawMaterial stock per the BOM of each item sold. A negative
 * resulting stock is allowed on purpose, it's a useful "you're out of
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

export async function addOrder(
  order: Order,
  options?: { forceProductionPending?: boolean; productionStage?: ProductionStage; reserveStock?: boolean },
): Promise<Order> {
  const { createdAt, address, ...rest } = order;
  const productionStage =
    options?.productionStage ?? (options?.forceProductionPending ? "inicio" : await determineProductionStage(order));
  const reserve = options?.reserveStock === true;
  const created = await db.$transaction(async (tx) => {
    if (reserve) await reserveStock(tx, order.items);
    return tx.order.create({
      data: {
        ...rest,
        createdAt: new Date(createdAt),
        items: rest.items as unknown as Prisma.InputJsonValue,
        address: address ? (address as unknown as Prisma.InputJsonValue) : undefined,
        productionStage,
        stockReserved: reserve,
      },
    });
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

/** Like UpdateOrderResult, plus the status the order had right before this update, lets callers tell whether it's worth notifying the customer. */
export type OrderStatusUpdateResult =
  | { success: true; order: Order; previousStatus: OrderStatus }
  | { success: false; error: string };

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  tracking?: string,
): Promise<OrderStatusUpdateResult> {
  const existing = await db.order.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Pedido não encontrado." };
  const updated = await db.order.update({
    where: { id },
    data: {
      status,
      ...(tracking !== undefined ? { tracking: tracking || null } : {}),
      // Quando virou "Entregue" (uma vez só): base do pós-venda automático.
      ...(status === "Entregue" && !existing.deliveredAt ? { deliveredAt: new Date() } : {}),
    },
  });
  // Cancelar um pedido que tinha estoque reservado devolve as peças e os insumos (uma vez só).
  if (status === "Cancelado" && existing.status !== "Cancelado") await releaseReservation(id);
  return { success: true, order: toOrder(updated), previousStatus: existing.status as OrderStatus };
}

/**
 * Confirma à mão o pagamento de vendas lançadas no painel (presencial, WhatsApp, marketplace, encomenda): pagamento aprovado,
 * valor recebido = total (some do "a receber") e, se o pedido ainda estava só "recebido", ele passa a "Pagamento aprovado" para
 * entrar no faturamento. Pedidos do site não entram: quem confirma o Pix/cartão deles é o Mercado Pago, sozinho.
 */
export async function markOrdersPaid(ids: string[]): Promise<{ updated: number }> {
  const rows = await db.order.findMany({
    where: { id: { in: ids }, channel: { not: "online" }, status: { not: "Cancelado" }, paymentStatus: { in: ["pending", "in_process"] } },
    select: { id: true, total: true, status: true, depositAmount: true, paymentStatus: true },
  });
  if (rows.length === 0) return { updated: 0 };
  await db.$transaction(
    rows.flatMap((row) => {
      const missing = row.total - receivedAmount(row);
      return [
        db.order.update({
          where: { id: row.id },
          data: {
            paymentStatus: "approved",
            depositAmount: row.total,
            ...(row.status === "Pedido recebido" ? { status: "Pagamento aprovado" } : {}),
          },
        }),
        ...(missing > 0 ? [db.orderPayment.create({ data: { orderId: row.id, amount: missing } })] : []),
      ];
    }),
  );
  return { updated: rows.length };
}

/** Cada recebimento registrado nas vendas do painel (para o "Em caixa" saber o dia em que o dinheiro entrou). */
export async function getAllOrderPayments(): Promise<{ orderId: string; amount: number; paidAt: string }[]> {
  const rows = await db.orderPayment.findMany({ orderBy: { paidAt: "asc" } });
  return rows.map((r) => ({ orderId: r.orderId, amount: r.amount, paidAt: r.paidAt.toISOString() }));
}

export type SetPaymentResult =
  | { success: true; received: number; paid: boolean; total: number }
  | { success: false; error: string };

/**
 * Registra (mode "add") ou corrige (mode "set") o valor recebido de uma venda lançada no painel. Completou o valor: pagamento
 * aprovado e, se estava só "recebido", o status vira "Pagamento aprovado". Voltou a faltar dinheiro (desfazer): pagamento volta a
 * pendente e, se o status ainda é exatamente "Pagamento aprovado", volta para "Pedido recebido". Pagamento parcial não mexe no status.
 */
export async function setManualOrderPayment(id: string, mode: "add" | "set", amount: number): Promise<SetPaymentResult> {
  const order = await db.order.findUnique({ where: { id } });
  if (!order) return { success: false, error: "Pedido não encontrado." };
  if (order.channel === "online") return { success: false, error: "O pagamento dos pedidos do site é confirmado pelo Mercado Pago." };
  if (order.status === "Cancelado") return { success: false, error: "Esse pedido está cancelado." };

  const before = receivedAmount(order);
  const change = applyManualPayment(order.total, before, mode, amount);
  let status = order.status;
  if (change.paid && status === "Pedido recebido") status = "Pagamento aprovado";
  if (!change.paid && status === "Pagamento aprovado") status = "Pedido recebido";
  const delta = round2(change.received - before);
  await db.$transaction([
    db.order.update({
      where: { id },
      data: { depositAmount: change.received, paymentStatus: change.paid ? "approved" : "pending", status },
    }),
    ...(delta !== 0 ? [db.orderPayment.create({ data: { orderId: id, amount: delta } })] : []),
  ]);
  return { success: true, received: change.received, paid: change.paid, total: order.total };
}

export type PaymentUpdateResult =
  | { success: true; order: Order; previousStatus: OrderStatus }
  | { success: false; reason: "not_found" | "amount_mismatch"; error: string };

/**
 * Reconciles a Mercado Pago payment with its order, found by `mpPaymentId`, or by the
 * `external_reference` (our order id) when the order was saved before the payment id was
 * recorded. Never trusts the webhook body: the caller passes what it re-fetched from the gateway.
 *
 * Status only moves forward: an "approved" notification advances a "Pedido recebido" order, but a
 * repeated or late one can never pull an already "Enviado" order back. Refunds and chargebacks
 * update the raw payment status only (the caller alerts the owner). Compare-and-set on the status
 * makes two simultaneous notifications process once, so the customer isn't e-mailed twice.
 */
export async function applyPaymentUpdate(input: {
  mpPaymentId: string;
  externalReference?: string | null;
  paymentStatus: string;
  transactionAmount?: number;
  /** Líquido recebido (informado pelo Mercado Pago quando aprovado): a diferença para o valor pago é a taxa. */
  netReceived?: number;
}): Promise<PaymentUpdateResult> {
  const existing =
    (await db.order.findUnique({ where: { mpPaymentId: input.mpPaymentId } })) ??
    (input.externalReference ? await db.order.findUnique({ where: { id: input.externalReference } }) : null);
  if (!existing) return { success: false, reason: "not_found", error: "Pedido não encontrado para esse pagamento." };

  if (
    input.paymentStatus === "approved" &&
    input.transactionAmount !== undefined &&
    Math.abs(input.transactionAmount - existing.total) > 0.01
  ) {
    return {
      success: false,
      reason: "amount_mismatch",
      error: `Valor pago (${input.transactionAmount}) diferente do total do pedido (${existing.total}).`,
    };
  }

  const previousStatus = existing.status as OrderStatus;
  let nextStatus: OrderStatus = previousStatus;
  if (previousStatus === "Pedido recebido") {
    if (input.paymentStatus === "approved") nextStatus = "Pagamento aprovado";
    else if (input.paymentStatus === "rejected" || input.paymentStatus === "cancelled") nextStatus = "Cancelado";
  }

  const claimed = await db.order.updateMany({
    where: { id: existing.id, status: existing.status, paymentStatus: existing.paymentStatus },
    data: {
      paymentStatus: input.paymentStatus,
      status: nextStatus,
      mpPaymentId: existing.mpPaymentId ?? input.mpPaymentId,
      ...(feeFrom(input.paymentStatus, input.transactionAmount, input.netReceived) !== undefined
        ? { paymentFee: feeFrom(input.paymentStatus, input.transactionAmount, input.netReceived) }
        : {}),
    },
  });
  const current = await db.order.findUniqueOrThrow({ where: { id: existing.id } });
  if (claimed.count === 0) {
    // Outra notificação processou este pedido primeiro: nada a notificar de novo.
    return { success: true, order: toOrder(current), previousStatus: current.status as OrderStatus };
  }
  if (nextStatus === "Cancelado") await releaseReservation(existing.id);
  return { success: true, order: toOrder(current), previousStatus };
}

/** Taxa = valor pago - líquido recebido; só faz sentido com pagamento aprovado e valores coerentes. */
export function feeFrom(paymentStatus: string, paid?: number, net?: number): number | undefined {
  if (paymentStatus !== "approved" || paid === undefined || net === undefined || net <= 0 || net > paid) return undefined;
  return Math.round((paid - net) * 100) / 100;
}

/** Grava o resultado do pagamento no pedido criado antes da cobrança. */
export async function recordPaymentOutcome(
  id: string,
  data: {
    mpPaymentId: string;
    paymentStatus: string;
    status: OrderStatus;
    paymentMethod: Order["paymentMethod"];
    paymentFee?: number;
  },
): Promise<void> {
  await db.order.update({ where: { id }, data });
}

/** Desfaz um pedido que nunca foi cobrado (pagamento recusado/falhou): devolve estoque e apaga o registro. */
export async function discardUnpaidOrder(id: string): Promise<void> {
  await releaseReservation(id);
  await db.order.delete({ where: { id } }).catch(() => undefined);
}

/** Cancela um pedido ainda não pago (ex.: Pix/boleto vencido) e devolve o estoque reservado. */
export async function cancelUnpaidOrder(id: string): Promise<boolean> {
  const result = await db.order.updateMany({
    where: { id, status: "Pedido recebido" },
    data: { status: "Cancelado", paymentStatus: "cancelled" },
  });
  if (result.count === 0) return false;
  await releaseReservation(id);
  return true;
}

/**
 * Pedidos com Pix ainda sem pagar, criados entre `createdAfter` e `createdBefore` e que ainda não receberam o lembrete
 * "seu Pix vence hoje" (o Pix vence em 1 dia).
 */
export async function findPixOrdersAwaitingReminder(createdAfter: Date, createdBefore: Date): Promise<Order[]> {
  const rows = await db.order.findMany({
    where: {
      channel: "online",
      paymentMethod: "pix",
      status: "Pedido recebido",
      paymentStatus: { in: ["pending", "in_process"] },
      pixReminderSentAt: null,
      userEmail: { not: null },
      mpPaymentId: { not: null },
      createdAt: { gt: createdAfter, lt: createdBefore },
    },
  });
  return rows.map(toOrder);
}

export async function markPixReminderSent(id: string): Promise<void> {
  await db.order.update({ where: { id }, data: { pixReminderSentAt: new Date() } });
}

export async function findStaleUnpaidOrders(olderThan: Date): Promise<Order[]> {
  const rows = await db.order.findMany({
    where: {
      channel: "online",
      status: "Pedido recebido",
      paymentStatus: { in: ["pending", "in_process"] },
      createdAt: { lt: olderThan },
    },
  });
  return rows.map(toOrder);
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

export type DeleteOrderResult = { success: true } | { success: false; error: string };

export async function deleteOrder(id: string): Promise<DeleteOrderResult> {
  const existing = await db.order.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Pedido não encontrado." };
  // Excluir também devolve o estoque reservado (se ainda houver), senão a peça some do estoque sem venda.
  await releaseReservation(id);
  await db.order.delete({ where: { id } });
  return { success: true };
}

// Sem 0/O/1/I/L: o cliente digita este código no rastreamento e lê por telefone.
const ORDER_ID_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** `FAZ-` + 8 caracteres aleatórios criptográficos (~850 bilhões de combinações). Pedidos antigos (FAZ-123456) continuam válidos. */
export function generateOrderId() {
  let code = "";
  for (let i = 0; i < 8; i++) code += ORDER_ID_ALPHABET[randomInt(ORDER_ID_ALPHABET.length)];
  return `FAZ-${code}`;
}

/** Gera um id que ainda não existe no banco (a colisão é improvável, mas o id também é a chave de idempotência do pagamento). */
export async function generateUniqueOrderId(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = generateOrderId();
    if (!(await db.order.findUnique({ where: { id }, select: { id: true } }))) return id;
  }
  throw new Error("Não foi possível gerar um número de pedido único.");
}
