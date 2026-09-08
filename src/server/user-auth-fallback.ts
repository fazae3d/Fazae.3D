import bcrypt from "bcryptjs";
import { findOrCreateOAuthUser, verifyPassword } from "./repositories/user-repository";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackUsers } from "./demo-fallback";
import type { DemoUser } from "./types";

/**
 * Replays the credentials check against the seeded demo accounts
 * (demo@fazae3d.com.br / teste@fazae.com) so login keeps working with no
 * database — mirrors validateCouponWithFallback's pattern.
 * TODO(fase DB): remove o fallback quando a Fazaê tiver o próprio banco.
 */
export async function verifyPasswordWithFallback(email: string, password: string): Promise<DemoUser | null> {
  const fallback = (() => {
    const user = fallbackUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
    return user && bcrypt.compareSync(password, user.passwordHash) ? user : null;
  })();
  return withReadFallback(() => verifyPassword(email, password), fallback);
}

export async function findOrCreateOAuthUserWithFallback(input: { name: string; email: string }): Promise<DemoUser> {
  const fallback: DemoUser =
    fallbackUsers.find((u) => u.email.toLowerCase() === input.email.toLowerCase()) ?? {
      id: `demo-oauth-${input.email}`,
      name: input.name,
      email: input.email,
      passwordHash: "",
      role: "customer",
      addresses: [],
    };
  return withReadFallback(() => findOrCreateOAuthUser(input), fallback);
}
