import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Stashed on globalThis because Next.js (Turbopack, dev mode) gives Server
 * Actions, Route Handlers and Middleware separate module instances per
 * compilation layer — a plain module-level variable would get a fresh
 * PrismaClient (and a fresh connection pool) per layer instead of sharing
 * one, and Fast Refresh would pile up new clients/pools on every edit.
 */
declare global {
  var __flxPrisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const db = globalThis.__flxPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__flxPrisma = db;
}
