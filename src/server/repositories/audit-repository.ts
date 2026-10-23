import { db } from "../db";
import { AUDITED_MODELS } from "@/lib/audit-format";

export type AuditFilters = { q?: string; quem?: string; tipo?: string; area?: string; de?: string; ate?: string };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const KINDS = ["create", "update", "delete", "event"];

/** Dia da loja (UTC-3 fixo): 00:00 local = 03:00 UTC. */
const startOf = (day: string) => new Date(`${day}T03:00:00.000Z`);
const endOf = (day: string) => new Date(startOf(day).getTime() + 24 * 3_600_000);

export function buildAuditWhere(filters: AuditFilters) {
  const q = filters.q?.trim();
  return {
    ...(filters.quem ? { actorEmail: filters.quem } : {}),
    ...(filters.tipo && KINDS.includes(filters.tipo) ? { kind: filters.tipo } : {}),
    ...(filters.area ? { targetType: filters.area } : {}),
    ...((filters.de && DAY.test(filters.de)) || (filters.ate && DAY.test(filters.ate))
      ? {
          at: {
            ...(filters.de && DAY.test(filters.de) ? { gte: startOf(filters.de) } : {}),
            ...(filters.ate && DAY.test(filters.ate) ? { lt: endOf(filters.ate) } : {}),
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { targetId: { contains: q, mode: "insensitive" as const } },
            { action: { contains: q, mode: "insensitive" as const } },
            { actorEmail: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}

export type AuditEntryView = {
  id: string;
  at: string;
  actorEmail: string;
  action: string;
  kind: string;
  targetType: string;
  targetId: string;
  details: unknown;
  changes: { field: string; from: unknown; to: unknown }[];
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  restoredAt: string | null;
  restoredBy: string | null;
};

type Row = Awaited<ReturnType<typeof db.auditLog.findFirstOrThrow>>;

export function toAuditEntry(row: Row): AuditEntryView {
  return {
    id: row.id,
    at: row.at.toISOString(),
    actorEmail: row.actorEmail,
    action: row.action,
    kind: row.kind,
    targetType: row.targetType,
    targetId: row.targetId,
    details: row.details,
    changes: Array.isArray(row.changes) ? (row.changes as AuditEntryView["changes"]) : [],
    before: (row.before as Record<string, unknown> | null) ?? null,
    after: (row.after as Record<string, unknown> | null) ?? null,
    restoredAt: row.restoredAt?.toISOString() ?? null,
    restoredBy: row.restoredBy,
  };
}

export const AUDIT_PAGE_SIZE = 50;

export async function listAudit(filters: AuditFilters, page: number): Promise<{ entries: AuditEntryView[]; total: number }> {
  const where = buildAuditWhere(filters);
  const [rows, total] = await Promise.all([
    db.auditLog.findMany({ where, orderBy: { at: "desc" }, take: AUDIT_PAGE_SIZE, skip: Math.max(0, page - 1) * AUDIT_PAGE_SIZE }),
    db.auditLog.count({ where }),
  ]);
  return { entries: rows.map(toAuditEntry), total };
}

export async function listAuditForExport(filters: AuditFilters, limit = 5000): Promise<AuditEntryView[]> {
  const rows = await db.auditLog.findMany({ where: buildAuditWhere(filters), orderBy: { at: "desc" }, take: limit });
  return rows.map(toAuditEntry);
}

/** Quem já fez alguma coisa e em que áreas (para os filtros). */
export async function listAuditFacets(): Promise<{ actors: string[]; areas: { key: string; label: string }[] }> {
  const [actors, areas] = await Promise.all([
    db.auditLog.findMany({ distinct: ["actorEmail"], select: { actorEmail: true }, orderBy: { actorEmail: "asc" }, take: 100 }),
    db.auditLog.findMany({ distinct: ["targetType"], select: { targetType: true }, take: 100 }),
  ]);
  return {
    actors: actors.map((a) => a.actorEmail),
    areas: areas
      .map((a) => a.targetType)
      .sort()
      .map((key) => ({ key, label: AUDITED_MODELS[key]?.label ?? key })),
  };
}
