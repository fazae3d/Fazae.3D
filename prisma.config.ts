import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// This project keeps all local secrets in .env.local (Next.js's own
// convention), not the default .env dotenv looks for.
config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Migrations need a connection that supports prepared statements, which
  // the transaction-mode pooler (DATABASE_URL) doesn't — the app runtime's
  // PrismaClient (src/server/db.ts) points at DATABASE_URL directly instead
  // and never reads this config; this URL is only for CLI commands
  // (migrate, db seed, studio).
  datasource: {
    url: process.env["DIRECT_URL"],
  },
});
