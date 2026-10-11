import { auth } from "@/auth";
import { db } from "./db";

/**
 * Registra uma ação sensível do painel. Nunca lança: um log que falha não pode impedir a ação em si.
 * "actor" é o admin logado (e-mail da sessão).
 */
export async function logAdminAction(
  action: string,
  targetType: string,
  targetId: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    const session = await auth();
    await db.auditLog.create({
      data: {
        actorEmail: session?.user?.email ?? "desconhecido",
        action,
        targetType,
        targetId,
        details: details ? JSON.parse(JSON.stringify(details)) : undefined,
      },
    });
  } catch (error) {
    console.error("[auditoria] falha ao registrar", action, targetType, targetId, error);
  }
}
