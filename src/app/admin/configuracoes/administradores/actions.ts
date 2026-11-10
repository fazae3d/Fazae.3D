"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { withMutationFallback } from "@/lib/db-fallback";
import { logAdminAction } from "@/server/audit";
import { addAdmin, removeAdmin } from "@/server/repositories/admin-repository";

export type AdminActionResult = { success: true; message: string } | { success: false; error: string };

async function currentAdminEmail(): Promise<string | null> {
  if (ADMIN_AUTH_DISABLED) return "";
  const session = await auth();
  return session?.user?.role === "admin" ? (session.user.email ?? "") : null;
}

const emailSchema = z.string().trim().toLowerCase().email("Informe um e-mail válido.").max(160);

export async function addAdminAction(input: { email: string; name?: string }): Promise<AdminActionResult> {
  const actor = await currentAdminEmail();
  if (actor === null) return { success: false, error: "Acesso restrito ao administrador." };
  const email = emailSchema.safeParse(input.email);
  if (!email.success) return { success: false, error: email.error.issues[0]?.message ?? "E-mail inválido." };
  const name = input.name?.trim().slice(0, 80);

  const result = await withMutationFallback(async () => addAdmin(email.data, name));
  if (!result.success) return { success: false, error: result.error };
  await logAdminAction("admin.adicionar", "User", email.data, { email: email.data, contaNova: result.created });
  revalidatePath("/admin/configuracoes/administradores");
  return {
    success: true,
    message: result.created
      ? `${email.data} agora é administrador. Peça para a pessoa entrar em /login com o Google desse e-mail (ou usar "Esqueci minha senha").`
      : `${email.data} agora é administrador. Na próxima vez que abrir o painel, o acesso já vale.`,
  };
}

export async function removeAdminAction(id: string): Promise<AdminActionResult> {
  const actor = await currentAdminEmail();
  if (actor === null) return { success: false, error: "Acesso restrito ao administrador." };

  const result = await withMutationFallback(async () => {
    const { db } = await import("@/server/db");
    const target = await db.user.findUnique({ where: { id }, select: { email: true } });
    if (target && actor && target.email.toLowerCase() === actor.toLowerCase()) {
      return { success: false as const, error: "Você não pode remover o seu próprio acesso. Peça para outro administrador fazer isso." };
    }
    return removeAdmin(id);
  });
  if (!result.success) return { success: false, error: result.error };
  await logAdminAction("admin.remover", "User", result.email, { email: result.email });
  revalidatePath("/admin/configuracoes/administradores");
  return { success: true, message: `${result.email} não é mais administrador. O acesso ao painel acaba na hora.` };
}
