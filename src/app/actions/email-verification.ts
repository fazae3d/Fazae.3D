"use server";

import { auth } from "@/auth";
import { sendVerificationEmail } from "@/lib/email-verification";
import { rateLimit } from "@/server/rate-limit";
import { findUserByEmail } from "@/server/repositories/user-repository";

export type ResendVerificationResult = { success: true } | { success: false; error: string };

/** Reenvia o link de confirmação para o e-mail da conta que está logada. */
export async function resendVerificationAction(): Promise<ResendVerificationResult> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { success: false, error: "Entre na sua conta para continuar." };

  const limited = await rateLimit(`verify-resend:${email.toLowerCase()}`, 3, 60 * 60 * 1000);
  if (!limited.allowed) return { success: false, error: "Você já pediu o link várias vezes. Tente de novo mais tarde." };

  const user = await findUserByEmail(email);
  if (!user) return { success: false, error: "Conta não encontrada." };
  if (user.emailVerified) return { success: true };

  const result = await sendVerificationEmail(user.email, user.name);
  return result.success ? { success: true } : { success: false, error: "Não foi possível enviar o e-mail agora. Tente mais tarde." };
}
