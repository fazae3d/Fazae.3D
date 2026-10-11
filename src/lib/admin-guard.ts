import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { db } from "@/server/db";

/** Para route handlers do painel: confere a sessão e o papel atual no banco. */
export async function isAdminRequest(): Promise<boolean> {
  if (ADMIN_AUTH_DISABLED) return true;
  const session = await auth();
  const email = session?.user?.email;
  if (!email || session?.user?.role !== "admin") return false;
  try {
    const row = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { role: true } });
    return row?.role === "admin";
  } catch {
    return true;
  }
}
