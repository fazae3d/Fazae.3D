"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { profileSchema } from "@/lib/validation";
import { updateUserName } from "@/server/repositories/user-repository";
import { withMutationFallback } from "@/lib/db-fallback";

export type UpdateProfileResult = { success: true; name: string } | { success: false; error: string };

export async function updateProfileAction(input: unknown): Promise<UpdateProfileResult> {
  const session = await auth();
  if (!session?.user?.email) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // TODO(fase DB): remove o fallback quando a Fazaê tiver o próprio banco — hoje a escrita real falharia sem Supabase configurado.
  const result = await withMutationFallback(async () => {
    const user = await updateUserName(session.user!.email!, parsed.data.name);
    if (!user) return { success: false as const, error: "Usuário não encontrado." };
    return { success: true as const, name: user.name };
  });

  if (result.success) {
    revalidatePath("/conta");
  }
  return result;
}
