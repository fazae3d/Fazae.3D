/**
 * TEMPORARY (dev only): no database is connected yet, so nobody can log
 * in — this lets admin actions run without a real session so the panel
 * can still be worked on. Flip back to `false` (or delete every call site
 * that checks it) once the real database/login is wired up. Never ship
 * with this `true` — see also the matching flag in src/middleware.ts.
 */
export const ADMIN_AUTH_DISABLED = false;
