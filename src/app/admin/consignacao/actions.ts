"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import {
  consigneeFormSchema,
  deliverConsignmentItemSchema,
  registerConsignmentSaleReturnSchema,
  registerConsignmentVisitSchema,
  type ConsigneeFormInput,
  type DeliverConsignmentItemInput,
  type RegisterConsignmentSaleReturnInput,
  type RegisterConsignmentVisitInput,
} from "@/lib/admin-validation";
import {
  adjustConsignmentItemQuantity,
  createConsignee,
  createConsignmentVisit,
  deleteConsignee,
  deliverConsignmentItem,
  getConsignmentItem,
  updateConsignee,
} from "@/server/repositories/consignment-repository";
import { getProduct, updateProduct } from "@/server/repositories/product-repository";
import type { Consignee } from "@/server/types";
import { withMutationFallback } from "@/lib/db-fallback";

type ConsigneeMutationResult = { success: true; consignee: Consignee } | { success: false; error: string };
type SimpleResult = { success: true } | { success: false; error: string };

async function requireAdmin() {
  if (ADMIN_AUTH_DISABLED) return true;
  const session = await auth();
  return session?.user?.role === "admin";
}

function toDateOrUndefined(value?: string) {
  return value ? new Date(value) : undefined;
}

function revalidateConsigneePaths(id?: string) {
  revalidatePath("/admin/consignacao");
  if (id) revalidatePath(`/admin/consignacao/${id}`);
}

export async function createConsigneeAction(input: ConsigneeFormInput): Promise<ConsigneeMutationResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const parsed = consigneeFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  return withMutationFallback(async () => {
    const consignee = await createConsignee({ ...parsed.data, email: parsed.data.email || undefined });
    revalidateConsigneePaths(consignee.id);
    return { success: true, consignee };
  });
}

export async function updateConsigneeAction(
  id: string,
  input: ConsigneeFormInput,
): Promise<ConsigneeMutationResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const parsed = consigneeFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  return withMutationFallback(async () => {
    const consignee = await updateConsignee(id, { ...parsed.data, email: parsed.data.email || undefined });
    if (!consignee) {
      return { success: false, error: "Lojista não encontrado." };
    }
    revalidateConsigneePaths(id);
    return { success: true, consignee };
  });
}

export async function deleteConsigneeAction(id: string): Promise<SimpleResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  return withMutationFallback(async () => {
    await deleteConsignee(id);
    revalidateConsigneePaths();
    return { success: true };
  });
}

export async function deliverItemAction(
  consigneeId: string,
  input: DeliverConsignmentItemInput,
): Promise<SimpleResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const parsed = deliverConsignmentItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  return withMutationFallback(async () => {
    const product = await getProduct(parsed.data.productSlug);
    if (!product) {
      return { success: false, error: "Produto não encontrado." };
    }
    if (product.stock < parsed.data.quantity) {
      return {
        success: false,
        error: `"${product.name}" não tem estoque suficiente (${product.stock} disponível, ${parsed.data.quantity} solicitado).`,
      };
    }

    await deliverConsignmentItem({ consigneeId, ...parsed.data });
    await updateProduct(parsed.data.productSlug, { stock: product.stock - parsed.data.quantity });
    revalidateConsigneePaths(consigneeId);
    return { success: true };
  });
}

export async function registerSaleReturnAction(
  consigneeId: string,
  input: RegisterConsignmentSaleReturnInput,
): Promise<SimpleResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const parsed = registerConsignmentSaleReturnSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  return withMutationFallback(async () => {
    const { productSlug, quantitySold = 0, quantityReturned = 0 } = parsed.data;
    const item = await getConsignmentItem(consigneeId, productSlug);
    if (!item) {
      return { success: false, error: "Este produto não está consignado com esse lojista." };
    }
    const totalBaixa = quantitySold + quantityReturned;
    if (totalBaixa > item.quantity) {
      return {
        success: false,
        error: `Saldo atual é de ${item.quantity} unidade(s) — não é possível dar baixa em ${totalBaixa}.`,
      };
    }

    await adjustConsignmentItemQuantity(consigneeId, productSlug, -totalBaixa);
    if (quantityReturned > 0) {
      const product = await getProduct(productSlug);
      if (product) {
        await updateProduct(productSlug, { stock: product.stock + quantityReturned });
      }
    }
    revalidateConsigneePaths(consigneeId);
    return { success: true };
  });
}

export async function registerVisitAction(
  consigneeId: string,
  input: RegisterConsignmentVisitInput,
): Promise<SimpleResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const parsed = registerConsignmentVisitSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  return withMutationFallback(async () => {
    await createConsignmentVisit({
      consigneeId,
      visitDate: new Date(parsed.data.visitDate),
      nextVisitDate: toDateOrUndefined(parsed.data.nextVisitDate),
      amountCollected: parsed.data.amountCollected ?? 0,
      notes: parsed.data.notes,
    });
    revalidateConsigneePaths(consigneeId);
    return { success: true };
  });
}
