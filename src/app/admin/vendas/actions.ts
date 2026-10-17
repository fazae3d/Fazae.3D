"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { manualSaleFormSchema, type ManualSaleFormInput } from "@/lib/admin-validation";
import { round2 } from "@/lib/money";
import { computeChannelFee, isMarketplace } from "@/lib/channels";
import { getSettings } from "@/server/repositories/settings-repository";
import { addOrder, generateOrderId, OutOfStockError } from "@/server/repositories/order-repository";
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
  const { channel, channelFee, customerName, customerPhone, paymentMethod, status, items, productionPending, shipping } = parsed.data;

  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco — hoje a escrita real falharia sem Supabase configurado.
  const result = await withMutationFallback(async () => {
    // Resolve every line against the live catalog and re-check stock here —
    // the form's own copy of price/name is just a starting point for the
    // admin to edit, never trusted as-is.
    const resolvedItems = [];
    for (const line of items) {
      // Produto manual (peça personalizada fora da loja): não mexe em estoque e entra como "avulso", igual aos itens de produção.
      if (!line.productSlug) {
        const name = line.customName!.trim();
        resolvedItems.push({
          productSlug: `avulso-${slugify(name).slice(0, 60) || "item"}`,
          name,
          categoryName: "Avulso",
          material: line.material || "—",
          color: line.color || "—",
          quantity: line.quantity,
          price: line.price,
        });
        continue;
      }
      const product = await getProduct(line.productSlug);
      if (!product) {
        return { success: false, error: `Produto "${line.productSlug}" não encontrado.` };
      }
      if (product.type !== "sob_encomenda" && product.stock < line.quantity) {
        return {
          success: false,
          error: `"${product.name}" não tem estoque suficiente (${product.stock} disponível, ${line.quantity} solicitado).`,
        };
      }
      resolvedItems.push({
        productSlug: product.slug,
        name: product.name,
        categoryName: product.categoryName,
        material: line.material ?? "—",
        color: line.color ?? "—",
        quantity: line.quantity,
        price: line.price,
      });
    }

    const subtotal = round2(resolvedItems.reduce((sum, item) => sum + item.price * item.quantity, 0));

    // Marketplace: a taxa do canal entra como "taxa" do pedido (mesmo campo da taxa do Mercado Pago), para o lucro sair líquido.
    let paymentFee: number | undefined;
    if (isMarketplace(channel)) {
      if (channelFee !== undefined) {
        paymentFee = round2(channelFee);
      } else {
        const settings = await getSettings({ fresh: true }).catch(() => null);
        const units = resolvedItems.reduce((sum, item) => sum + item.quantity, 0);
        paymentFee = computeChannelFee(settings?.channelFees?.[channel], subtotal, units);
      }
    }

    const shippingCost = round2(shipping ?? 0);

    const order: Order = {
      id: generateOrderId(),
      createdAt: new Date().toISOString(),
      channel,
      customerName,
      customerPhone: customerPhone || undefined,
      items: resolvedItems,
      subtotal,
      shipping: shippingCost,
      discount: 0,
      total: round2(subtotal + shippingCost),
      paymentMethod,
      status,
      paymentFee,
    };

    // O estoque é baixado dentro da mesma transação que grava a venda (atômico), e fica marcado como
    // reservado: cancelar essa venda depois devolve as peças.
    try {
      const created = await addOrder(order, { forceProductionPending: productionPending, reserveStock: true });
      return { success: true, order: created };
    } catch (error) {
      if (error instanceof OutOfStockError) return { success: false, error: error.message };
      throw error;
    }
  });

  if (result.success) {
    revalidatePath("/admin/pedidos");
    revalidatePath("/admin/estoque");
    revalidatePath("/admin/produtos");
    revalidatePath("/admin");
  }

  return result;
}

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
