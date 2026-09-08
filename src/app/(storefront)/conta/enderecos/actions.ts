"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { savedAddressSchema } from "@/lib/validation";
import {
  addAddress,
  removeAddress,
  updateAddress,
  type AddressMutationResult,
  type DeleteAddressResult,
} from "@/server/repositories/user-repository";

async function requireEmail() {
  const session = await auth();
  return session?.user?.email ?? null;
}

function revalidateAddressPaths() {
  revalidatePath("/conta/enderecos");
  revalidatePath("/conta");
}

export async function createAddressAction(input: unknown): Promise<AddressMutationResult> {
  const email = await requireEmail();
  if (!email) return { success: false, error: "Você precisa estar logado." };

  const parsed = savedAddressSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const result = await addAddress(email, parsed.data);
  if (result.success) revalidateAddressPaths();
  return result;
}

export async function updateAddressAction(addressId: string, input: unknown): Promise<AddressMutationResult> {
  const email = await requireEmail();
  if (!email) return { success: false, error: "Você precisa estar logado." };

  const parsed = savedAddressSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const result = await updateAddress(email, addressId, parsed.data);
  if (result.success) revalidateAddressPaths();
  return result;
}

export async function deleteAddressAction(addressId: string): Promise<DeleteAddressResult> {
  const email = await requireEmail();
  if (!email) return { success: false, error: "Você precisa estar logado." };

  const result = await removeAddress(email, addressId);
  if (result.success) revalidateAddressPaths();
  return result;
}
