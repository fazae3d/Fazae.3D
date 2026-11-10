import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Deliberately built from the edge-safe config, not the full one exported
// by @/auth, that one pulls in the Credentials provider, which pulls in
// bcrypt + Prisma, which the Edge Runtime middleware runs in can't load.
const { auth } = NextAuth(authConfig);

const ADMIN_AUTH_DISABLED = false;

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

  // Being logged in is necessary but not sufficient for /admin, a
  // customer session must never reach it, even if they guess the URL.
  if (pathname.startsWith("/admin") && req.auth?.user?.role !== "admin") {
    // O papel do cookie pode estar velho (a pessoa foi promovida a administradora depois de entrar). Antes de recusar, uma rota no
    // servidor confere no banco e renova o cookie. O "r=1" evita repetir isso em círculo.
    if (req.nextUrl.searchParams.get("r") === "1") return Response.redirect(new URL("/", req.nextUrl.origin));
    const refresh = new URL("/api/admin-access/refresh", req.nextUrl.origin);
    refresh.searchParams.set("next", pathname);
    return Response.redirect(refresh);
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
