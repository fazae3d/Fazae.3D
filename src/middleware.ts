import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Deliberately built from the edge-safe config, not the full one exported
// by @/auth — that one pulls in the Credentials provider, which pulls in
// bcrypt + Prisma, which the Edge Runtime middleware runs in can't load.
const { auth } = NextAuth(authConfig);

// TEMPORARY (dev only): no database is connected yet, so nobody can log in
// — this bypasses the /admin login gate entirely so the panel can still be
// reached and worked on. Flip this back to `false` (or delete the block
// below) once the real database/login is wired up and before this ever
// goes anywhere public. Never ship with this `true`.
const ADMIN_AUTH_DISABLED = true;

export default auth((req) => {
  const isLoggedIn = Boolean(req.auth);
  const pathname = req.nextUrl.pathname;

  if (ADMIN_AUTH_DISABLED && pathname.startsWith("/admin")) {
    return;
  }

  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }

  // Being logged in is necessary but not sufficient for /admin — a
  // customer session must never reach it, even if they guess the URL.
  if (pathname.startsWith("/admin") && req.auth?.user?.role !== "admin") {
    return Response.redirect(new URL("/", req.nextUrl.origin));
  }
});

export const config = {
  matcher: [
    "/conta",
    "/conta/:path*",
    "/admin",
    "/admin/:path*",
  ],
};
