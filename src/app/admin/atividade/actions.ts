"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { AUDITED_MODELS, canRestore, describeChange, type AuditChange } from "@/lib/audit-format";
import { db } from "@/server/db";
import { logAdminAction } from "@/server/audit";

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const MASK = "(oculto)";

type AnyDelegate = {
  findUnique: (args: { where: Record<string, unknown> }) => Promise<Record<string, unknown> | null>;
  update: (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => Promise<unknown>;
  create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
};

/** Datas guardadas como texto voltam a ser datas; o resto segue como estava. */
function revive(value: unknown): unknown {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(value)) return new Date(value);
  return value;
}

const sameJson = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * Desfaz uma alteração registrada em Atividade: devolve os valores de antes (edição) ou recria o registro (exclusão).
 * Só desfaz uma edição se os campos ainda estiverem como a alteração deixou: se alguém mudou de novo depois, avisa em vez de sobrescrever.
 */
export async function restoreAuditEntryAction(id: string): Promise<{ success: true } | { success: false; error: string }> {
  if (!ADMIN_AUTH_DISABLED) {
    const session = await auth();
    if (session?.user?.role !== "admin") return { success: false, error: "Acesso restrito ao administrador." };
  }
  const session = await auth();
  const actor = session?.user?.email ?? "painel";

  const entry = await db.auditLog.findUnique({ where: { id } });
  if (!entry) return { success: false, error: "Registro não encontrado." };
  if (!canRestore(entry)) return { success: false, error: "Esta alteração não pode ser desfeita pelo painel." };
  const info = AUDITED_MODELS[entry.targetType];
  const delegate = (db as unknown as Record<string, AnyDelegate>)[lowerFirst(entry.targetType)];
  if (!info || !delegate) return { success: false, error: "Tipo de registro desconhecido." };

  const pkValue: string | number = info.pk === "id" && /^\d+$/.test(entry.targetId) && (entry.targetType === "Settings" || entry.targetType === "WaConfig") ? Number(entry.targetId) : entry.targetId;
  const where = { [info.pk]: pkValue };

  try {
    if (entry.kind === "update") {
      const current = await delegate.findUnique({ where });
      if (!current) return { success: false, error: "O registro não existe mais." };
      const changes = (Array.isArray(entry.changes) ? entry.changes : []) as unknown as AuditChange[];
      const stale = changes.filter((c) => c.to !== MASK && !sameJson(JSON.parse(JSON.stringify(current[c.field] ?? null)), c.to ?? null));
      if (stale.length > 0) {
        return { success: false, error: `Isto já foi alterado de novo depois (${stale.map((c) => describeChange(c).split(":")[0]).join(", ")}). Confira o histórico antes de desfazer.` };
      }
      const data = Object.fromEntries(changes.filter((c) => c.from !== MASK).map((c) => [c.field, revive(c.from)]));
      if (Object.keys(data).length === 0) return { success: false, error: "Nada para desfazer." };
      await delegate.update({ where, data });
    } else {
      const before = (entry.before ?? null) as Record<string, unknown> | null;
      if (!before) return { success: false, error: "Faltam os dados de antes para recriar." };
      if (await delegate.findUnique({ where })) return { success: false, error: "Já existe um registro com esse identificador." };
      const data = Object.fromEntries(Object.entries(before).filter(([, v]) => v !== MASK).map(([k, v]) => [k, revive(v)]));
      await delegate.create({ data });
    }
  } catch (error) {
    console.error("[auditoria] falha ao desfazer", id, error);
    return { success: false, error: "Não foi possível desfazer esta alteração (os dados mudaram de forma que não dá para voltar sozinho)." };
  }

  await db.auditLog.update({ where: { id }, data: { restoredAt: new Date(), restoredBy: actor } });
  await logAdminAction("auditoria.desfazer", entry.targetType, entry.targetId, { alteracao: id, tipo: entry.kind });
  revalidatePath("/admin", "layout");
  return { success: true };
}
