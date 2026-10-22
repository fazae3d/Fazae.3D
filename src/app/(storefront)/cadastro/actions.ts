"use server";

import { createUser, findUserByEmail } from "@/server/repositories/user-repository";
import { getClientIp, rateLimit } from "@/server/rate-limit";
import { signupSchema } from "@/lib/validation";
import { sendVerificationEmail } from "@/lib/email-verification";

const SIGNUP_LIMIT = 10;
const SIGNUP_WINDOW_MS = 10 * 60 * 1000;

export type SignupResult = { success: true } | { success: false; error: string };

export async function signupAction(input: unknown): Promise<SignupResult> {
  const ip = await getClientIp();
  const limited = await rateLimit(`signup:${ip}`, SIGNUP_LIMIT, SIGNUP_WINDOW_MS);
  if (!limited.allowed) {
    return { success: false, error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." };
  }

  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { name, email, password } = parsed.data;

  let existing;
  try {
    existing = await findUserByEmail(email);
  } catch {
    return { success: false, error: "Não foi possível criar a conta agora. Tente de novo em instantes." };
  }
  if (existing) {
    return { success: false, error: "Já existe uma conta com esse e-mail." };
  }

  // TODO(fase DB): remove o fallback quando a Fazaê tiver o próprio banco, sem
  // Supabase não há como persistir a nova conta, então o cadastro é recusado
  // com uma mensagem clara em vez de travar com um erro 500.
  try {
    await createUser({ name, email, password });
    // Não bloqueia o cadastro se o e-mail falhar: a pessoa pode pedir o reenvio em "Meus pedidos".
    await sendVerificationEmail(email, name).catch((error) => console.error("[cadastro] e-mail de confirmação", error));
  } catch {
    return {
      success: false,
      error: "Não foi possível criar a conta agora. Tente de novo em instantes.",
    };
  }
  return { success: true };
}
