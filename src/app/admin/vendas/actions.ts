"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { manualSaleFormSchema, type ManualSaleFormInput } from "@/lib/admin-validation";
import { round2 } from "@/lib/money";
import { addOrder, generateOrderId } from "@/server/repositories/order-repository";
import { getProduct, updateProduct } from "@/server/repositories/product-repository";
import type { Order } from "@/server/types";
import { withMutationFallback } from "@/lib/db-fallback";

async function requireAdmin() {
  if (ADMIN_AUTH_DISABLED) return true;
  const session = await auth();
  return session?.user?.role === "admin";
}

export type CreateManualSaleResult = { success: true; order: Order } | { success: false; error: string };

export async function createManualSaleAction(input: ManualSaleFormInput): Promise<CreateManualSaleResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }

  const parsed = manualSaleFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { channel, customerName, customerPhone, paymentMethod, status, items } = parsed.data;

  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco — hoje a escrita real falharia sem Supabase configurado.
  const result = await withMutationFallback(async () => {
    // Resolve every line against the live catalog and re-check stock here —
    // the form's own copy of price/name is just a starting point for the
    // admin to edit, never trusted as-is.
    const resolvedItems = [];
    for (const line of items) {
      const product = await getProduct(line.productSlug);
      if (!product) {
        return { success: false, error: `Produto "${line.productSlug}" não encontrado.` };
      }
      if (product.stock < line.quantity) {
        return {
          success: false,
          error: `"${product.name}" não tem estoque suficiente (${product.stock} disponível, ${line.quantity} solicitado).`,
        };
      }
      resolvedItems.push({
        productSlug: product.slug,
        name: product.name,
        categoryName: product.categoryName,
        material: line.material,
        color: line.color,
        quantity: line.quantity,
        price: line.price,
      });
    }

    const subtotal = round2(resolvedItems.reduce((sum, item) => sum + item.price * item.quantity, 0));

    const order: Order = {
      id: generateOrderId(),
      createdAt: new Date().toISOString(),
      channel,
      customerName,
      customerPhone: customerPhone || undefined,
      items: resolvedItems,
      subtotal,
      shipping: 0,
      discount: 0,
      total: subtotal,
      paymentMethod,
      status,
    };

    const created = await addOrder(order);

    // Deduct stock per line. A plain read-then-write, not a single atomic
    // decrement — acceptable here since this is a low-volume admin-only tool,
    // not the public checkout path.
    for (const line of resolvedItems) {
      const product = await getProduct(line.productSlug);
      if (product) {
        await updateProduct(line.productSlug, { stock: product.stock - line.quantity });
      }
    }

    return { success: true, order: created };
  });

  if (result.success) {
    revalidatePath("/admin/pedidos");
    revalidatePath("/admin/estoque");
    revalidatePath("/admin/produtos");
    revalidatePath("/admin");
  }

  return result;
}
