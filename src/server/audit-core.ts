import { AsyncLocalStorage } from "node:async_hooks";
import { AUDITED_MODELS, diffRows, filledFields, isAuditedModel, rowKey, snapshotRow, type Row } from "@/lib/audit-format";

/**
 * Registro automático de mudanças: toda criação, edição e exclusão feita por um administrador nos cadastros e regras do painel
 * (produtos, cupons, configurações, gastos, cadências...) vira uma linha em Atividade, com o antes e o depois. Fica na camada do
 * banco (ver server/db.ts), então vale também para qualquer tela nova: ninguém precisa lembrar de registrar.
 */

const actorStore = new AsyncLocalStorage<{ email: string }>();

/** Roda um trecho "como" um administrador (usado em testes e tarefas disparadas pelo painel fora de uma requisição). */
export function withActor<T>(email: string, fn: () => Promise<T>): Promise<T> {
  return actorStore.run({ email }, fn);
}

/** Quem está agindo: o admin logado na requisição. Sistema, cliente e anônimo (webhooks, checkout, cron) não geram registro. */
export async function currentActor(): Promise<string | null> {
  const stored = actorStore.getStore();
  if (stored) return stored.email;
  try {
    const { auth } = await import("@/auth");
    const session = await auth();
    if (session?.user?.role === "admin" && session.user.email) return session.user.email;
  } catch {
    // Fora de uma requisição (cron, webhook, build): não há sessão.
  }
  return null;
}

const WRITE_OPERATIONS = new Set(["create", "createMany", "createManyAndReturn", "update", "updateMany", "updateManyAndReturn", "upsert", "delete", "deleteMany"]);
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

type Delegate = {
  findUnique: (args: { where: unknown }) => Promise<Row | null>;
};
type BaseClient = Record<string, unknown> & { auditLog: { create: (args: { data: Record<string, unknown> }) => Promise<unknown> } };

async function write(base: BaseClient, data: Record<string, unknown>) {
  try {
    await base.auditLog.create({ data });
  } catch (error) {
    // Um registro que falha nunca pode impedir a ação em si.
    console.error("[auditoria] falha ao registrar mudança", data.targetType, data.targetId, error);
  }
}

export async function auditedWrite(input: {
  base: BaseClient;
  model: string;
  operation: string;
  args: Record<string, unknown>;
  query: (args: Record<string, unknown>) => Promise<unknown>;
}): Promise<unknown> {
  const { base, model, operation, args, query } = input;
  if (!isAuditedModel(model) || !WRITE_OPERATIONS.has(operation)) return query(args);
  const actor = await currentActor();
  if (!actor) return query(args);

  const delegate = base[lowerFirst(model)] as Delegate | undefined;
  const where = (args.where ?? undefined) as Row | undefined;
  let before: Row | null = null;
  if (delegate && where && (operation === "update" || operation === "delete" || operation === "upsert")) {
    before = await delegate.findUnique({ where }).catch(() => null);
  }

  const result = await query(args);

  // Operações em lote: um registro só, com a quantidade (não dá para saber o antes de cada linha).
  if (operation.endsWith("Many") || operation.endsWith("ManyAndReturn")) {
    const count = Array.isArray(result) ? result.length : ((result as { count?: number } | null)?.count ?? 0);
    if (count > 0) {
      await write(base, {
        actorEmail: actor,
        action: `${model}.${operation}`,
        targetType: model,
        targetId: "varios",
        kind: operation.startsWith("create") ? "create" : operation.startsWith("update") ? "update" : "delete",
        details: { quantidade: count, filtro: snapshotRow((where ?? {}) as Row) },
      });
    }
    return result;
  }

  const row = (operation === "delete" ? before : (result as Row | null)) ?? null;
  const kind = operation === "delete" ? "delete" : operation === "create" ? "create" : before ? "update" : "create";
  const afterRow = operation === "delete" ? null : (result as Row | null);

  if (kind === "update") {
    const changes = diffRows(before, afterRow);
    if (changes.length === 0) return result;
    await write(base, {
      actorEmail: actor,
      action: `${model}.update`,
      targetType: model,
      targetId: rowKey(model, afterRow, where),
      kind,
      changes,
      before: snapshotRow(before),
      after: snapshotRow(afterRow),
    });
  } else if (kind === "create") {
    await write(base, {
      actorEmail: actor,
      action: `${model}.create`,
      targetType: model,
      targetId: rowKey(model, afterRow, where),
      kind,
      changes: filledFields(afterRow, "to"),
      after: snapshotRow(afterRow),
    });
  } else {
    await write(base, {
      actorEmail: actor,
      action: `${model}.delete`,
      targetType: model,
      targetId: rowKey(model, row, where),
      kind,
      changes: filledFields(row, "from"),
      before: snapshotRow(row),
    });
  }
  return result;
}

export { AUDITED_MODELS };
