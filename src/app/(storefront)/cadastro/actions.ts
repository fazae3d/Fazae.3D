"use server";

import { createUser, findUserByEmail } from "@/server/repositories/user-repository";
import { getClientIp, rateLimit } from "@/server/rate-limit";
import { signupSchema } from "@/lib/validation";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackUsers } from "@/server/demo-fallback";

const SIGNUP_LIMIT = 10;
const SIGNUP_WINDOW_MS = 10 * 60 * 1000;

export type SignupResult = { success: true } | { success: false; error: string };

export async function signupAction(input: unknown): Promise<SignupResult> {
  const ip = await getClientIp();
  const limited = rateLimit(`signup:${ip}`, SIGNUP_LIMIT, SIGNUP_WINDOW_MS);
  if (!limited.allowed) {
    return { success: false, error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." };
  }

  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { name, email, password } = parsed.data;

  const existing = await withReadFallback(
    () => findUserByEmail(email),
    fallbackUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()),
  );
  if (existing) {
    return { success: false, error: "Já existe uma conta com esse e-mail." };
  }

  // TODO(fase DB): remove o fallback quando a Fazaê tiver o próprio banco — sem
  // Supabase não há como persistir a nova conta, então o cadastro é recusado
  // com uma mensagem clara em vez de travar com um erro 500.
  try {
    await createUser({ name, email, password });
  } catch {
    return {
      success: false,
      error: "Não foi possível criar a conta agora. Configure o banco de dados (Supabase) para cadastros.",
    };
  }
  return { success: true };
}
