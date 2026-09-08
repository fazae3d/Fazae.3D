"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { customerCreateSchema, customerCrmSchema, type CustomerCreateInput, type CustomerCrmInput } from "@/lib/admin-validation";
import {
  updateCustomerCrmInfo,
  upsertCustomerFromContact,
} from "@/server/repositories/customer-repository";
import type { Customer } from "@/server/types";
import { withMutationFallback } from "@/lib/db-fallback";

type CustomerMutationResult = { success: true; customer: Customer } | { success: false; error: string };

async function requireAdmin() {
  if (ADMIN_AUTH_DISABLED) return true;
  const session = await auth();
  return session?.user?.role === "admin";
}

function parseTags(tagsRaw?: string): string[] {
  return (tagsRaw ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function revalidateCustomerPaths(id?: string) {
  revalidatePath("/admin/clientes");
  if (id) revalidatePath(`/admin/clientes/${id}`);
}

export async function updateCustomerNotesAction(
  id: string,
  input: CustomerCrmInput,
): Promise<CustomerMutationResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const parsed = customerCrmSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco — hoje a escrita real falharia sem Supabase configurado.
  return withMutationFallback(async () => {
    const customer = await updateCustomerCrmInfo(id, {
      notes: parsed.data.notes,
      tags: parseTags(parsed.data.tagsRaw),
    });
    if (!customer) {
      return { success: false, error: "Cliente não encontrado." };
    }
    revalidateCustomerPaths(id);
    return { success: true, customer };
  });
}

export async function createCustomerAction(input: CustomerCreateInput): Promise<CustomerMutationResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const parsed = customerCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco — hoje a escrita real falharia sem Supabase configurado.
  return withMutationFallback(async () => {
    const created = await upsertCustomerFromContact({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || undefined,
    });
    const customer = await updateCustomerCrmInfo(created.id, {
      notes: parsed.data.notes,
      tags: parseTags(parsed.data.tagsRaw),
    });
    revalidateCustomerPaths(created.id);
    return { success: true, customer: customer ?? created };
  });
}
