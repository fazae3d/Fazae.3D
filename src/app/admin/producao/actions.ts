"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import {
  addOrder,
  generateOrderId,
  updateOrderProduction,
  type UpdateOrderResult,
} from "@/server/repositories/order-repository";
import {
  createProductionItem,
  deleteProductionItem,
  getProductionItem,
  updateProductionItem,
} from "@/server/repositories/production-item-repository";
import { getProduct } from "@/server/repositories/product-repository";
import { productionItemSaleSchema, type ProductionItemSaleInput } from "@/lib/admin-validation";
import { round2 } from "@/lib/money";
import type { ProductionStage } from "@/generated/prisma/client";
import type { Order, OrderItem, ProductionItem } from "@/server/types";
import { withMutationFallback } from "@/lib/db-fallback";

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function requireAdmin() {
  if (ADMIN_AUTH_DISABLED) return true;
  const session = await auth();
  return session?.user?.role === "admin";
}

export async function updateProductionAction(
  orderId: string,
  data: { stage?: ProductionStage; deadline?: string | null; depositAmount?: number },
): Promise<UpdateOrderResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco — hoje a escrita real falharia sem Supabase configurado.
  const result = await withMutationFallback(() =>
    updateOrderProduction(orderId, {
      stage: data.stage,
      deadline: data.deadline === undefined ? undefined : data.deadline ? new Date(data.deadline) : null,
      depositAmount: data.depositAmount,
    }),
  );
  if (result.success) {
    revalidatePath("/admin/producao");
    revalidatePath("/admin/pedidos");
  }
  return result;
}

type ProductionItemResult = { success: true; item: ProductionItem } | { success: false; error: string };
type SimpleResult = { success: true } | { success: false; error: string };

export async function createProductionItemAction(input: {
  productSlug?: string;
  description: string;
  quantity: number;
  deadline?: string;
  notes?: string;
}): Promise<ProductionItemResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const description = input.description.trim();
  if (!description) {
    return { success: false, error: "Informe uma descrição para o item." };
  }
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    return { success: false, error: "Informe uma quantidade válida." };
  }
  return withMutationFallback(async () => {
    const item = await createProductionItem({
      productSlug: input.productSlug || undefined,
      description,
      quantity: input.quantity,
      deadline: input.deadline ? new Date(input.deadline) : undefined,
      notes: input.notes || undefined,
    });
    revalidatePath("/admin/producao");
    return { success: true, item };
  });
}

export async function updateProductionItemAction(
  id: string,
  data: { stage?: ProductionStage; deadline?: string | null; quantity?: number; notes?: string },
): Promise<ProductionItemResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  return withMutationFallback(async () => {
    const item = await updateProductionItem(id, {
      stage: data.stage,
      deadline: data.deadline === undefined ? undefined : data.deadline ? new Date(data.deadline) : null,
      quantity: data.quantity,
      notes: data.notes,
    });
    if (!item) {
      return { success: false, error: "Item não encontrado." };
    }
    revalidatePath("/admin/producao");
    return { success: true, item };
  });
}

export async function deleteProductionItemAction(id: string): Promise<SimpleResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  return withMutationFallback(async () => {
    await deleteProductionItem(id);
    revalidatePath("/admin/producao");
    return { success: true };
  });
}

type LaunchSaleResult = { success: true; order: Order } | { success: false; error: string };

/**
 * Turns an internal production item into a real sale: the Order takes over
 * the item's production stage and deadline (so it keeps its place on the
 * board, now as a "Pedido"), and the item itself is removed so it isn't
 * counted twice. Stock is deliberately untouched — the piece was made for
 * this sale, it never went through the catalog stock to begin with.
 */
export async function launchProductionItemAsSaleAction(
  itemId: string,
  input: ProductionItemSaleInput,
): Promise<LaunchSaleResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const parsed = productionItemSaleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { channel, customerName, customerPhone, paymentMethod, status, quantity, unitPrice, material, color } =
    parsed.data;

  return withMutationFallback(async () => {
    const item = await getProductionItem(itemId);
    if (!item) {
      return { success: false, error: "Item não encontrado." };
    }

    const product = item.productSlug ? await getProduct(item.productSlug) : undefined;
    const line: OrderItem = product
      ? {
          productSlug: product.slug,
          name: product.name,
          categoryName: product.categoryName,
          material: material || "—",
          color: color || "—",
          quantity,
          price: unitPrice,
        }
      : {
          productSlug: `avulso-${slugify(item.description) || "item"}`,
          name: item.description,
          categoryName: "Avulso",
          material: "—",
          color: "—",
          quantity,
          price: unitPrice,
        };

    const subtotal = round2(unitPrice * quantity);
    const order: Order = {
      id: generateOrderId(),
      createdAt: new Date().toISOString(),
      channel,
      customerName,
      customerPhone: customerPhone || undefined,
      items: [line],
      subtotal,
      shipping: 0,
      discount: 0,
      total: subtotal,
      paymentMethod,
      status,
      productionDeadline: item.deadline,
    };

    const created = await addOrder(order, { productionStage: item.stage });
    await deleteProductionItem(item.id);

    revalidatePath("/admin/producao");
    revalidatePath("/admin/pedidos");
    revalidatePath("/admin/financas");
    revalidatePath("/admin");
    return { success: true, order: created };
  });
}
