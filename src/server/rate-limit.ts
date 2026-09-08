import { headers } from "next/headers";

type Bucket = { count: number; resetAt: number };

/**
 * Same globalThis-singleton reasoning as db.ts: this needs to be shared
 * between the auth route handler and several Server Actions, which Next
 * dev (Turbopack) otherwise gives separate module instances.
 */
declare global {
  var __flxRateLimitBuckets: Map<string, Bucket> | undefined;
}

const MAX_TRACKED_KEYS = 5000;

function getBuckets() {
  if (!globalThis.__flxRateLimitBuckets) {
    globalThis.__flxRateLimitBuckets = new Map();
  }
  return globalThis.__flxRateLimitBuckets;
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * In-memory, per-key sliding-window-ish rate limiter (fixed window,
 * reset on expiry). In a real serverless deployment this counts per
 * instance, not globally — it stops noisy single-origin abuse (a script
 * hammering /login or brute-forcing a coupon code), not a distributed
 * attack. That needs a shared store (Redis/Upstash) instead.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const buckets = getBuckets();
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    pruneExpired(buckets, now);
    return { allowed: true };
  }

  if (existing.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { allowed: true };
}

function pruneExpired(buckets: Map<string, Bucket>, now: number) {
  if (buckets.size <= MAX_TRACKED_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
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
