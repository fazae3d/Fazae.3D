import { headers } from "next/headers";
import { db } from "./db";

type Bucket = { count: number; resetAt: number };

declare global {
  var __flxRateLimitBuckets: Map<string, Bucket> | undefined;
}

const MAX_TRACKED_KEYS = 5000;

function getBuckets() {
  if (!globalThis.__flxRateLimitBuckets) globalThis.__flxRateLimitBuckets = new Map();
  return globalThis.__flxRateLimitBuckets;
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/** Contador em memória: só serve de reserva quando o banco não responde (conta por instância, não é global). */
function rateLimitInMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const buckets = getBuckets();
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > MAX_TRACKED_KEYS) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return { allowed: true };
  }
  if (existing.count >= limit) return { allowed: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  existing.count += 1;
  return { allowed: true };
}

/**
 * Limite de tentativas por chave (janela fixa), guardado no Postgres para valer entre todas as
 * instâncias do servidor: numa hospedagem serverless, um contador em memória é zerado a cada
 * instância nova e não protege de nada. O UPSERT é atômico (uma única instrução). Se o banco
 * falhar, cai no contador em memória em vez de bloquear (ou liberar) todo mundo.
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  try {
    const newReset = new Date(Date.now() + windowMs);
    const rows = await db.$queryRaw<{ count: number; resetAt: Date }[]>`
      INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
      VALUES (${key}, 1, ${newReset})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimitBucket"."resetAt" <= NOW() THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= NOW() THEN ${newReset} ELSE "RateLimitBucket"."resetAt" END
      RETURNING "count", "resetAt"
    `;
    const row = rows[0];
    if (!row) return rateLimitInMemory(key, limit, windowMs);
    if (row.count > limit) {
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((new Date(row.resetAt).getTime() - Date.now()) / 1000)) };
    }
    return { allowed: true };
  } catch (error) {
    console.error("[rate-limit] banco indisponível, usando contador em memória", error);
    return rateLimitInMemory(key, limit, windowMs);
  }
}

/** Limpeza periódica (chamada pelo cron diário): apaga contadores já vencidos. */
export async function pruneRateLimitBuckets(): Promise<number> {
  const result = await db.rateLimitBucket.deleteMany({ where: { resetAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });
  return result.count;
}

function firstForwardedIp(headerValue: string | null) {
  if (!headerValue) return null;
  return headerValue.split(",")[0].trim();
}

/** For call sites with a raw Request (e.g. NextAuth's authorize). */
export function ipFromRequest(request: Request): string {
  return firstForwardedIp(request.headers.get("x-forwarded-for")) ?? request.headers.get("x-real-ip") ?? "unknown";
}

/** For Server Actions, which don't receive a Request but can read headers(). */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  return firstForwardedIp(h.get("x-forwarded-for")) ?? h.get("x-real-ip") ?? "unknown";
}
