import { findOrCreateOAuthUser, verifyPassword } from "./repositories/user-repository";
import { withReadFallback } from "@/lib/db-fallback";
import type { DemoUser } from "./types";

/**
 * Login só vale com o banco. Antes, se a leitura falhasse, caía numa lista de contas de demonstração
 * gravadas no código (incluindo um admin com senha conhecida) — o que deixaria uma porta aberta
 * justamente quando o banco está fora do ar. Agora a falha vira "login recusado".
 */
export async function verifyPasswordWithFallback(email: string, password: string): Promise<DemoUser | null> {
  return withReadFallback(() => verifyPassword(email, password), null);
}

export async function findOrCreateOAuthUserWithFallback(input: { name: string; email: string }): Promise<DemoUser | null> {
  return withReadFallback(() => findOrCreateOAuthUser(input), null);
}
