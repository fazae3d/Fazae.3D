import { NextRequest, NextResponse } from "next/server";
import { auth, unstable_update } from "@/auth";

export const dynamic = "force-dynamic";

/**
 * Quem foi promovido a administrador depois de entrar continua com "cliente" no cookie de login, e o filtro de entrada do painel
 * só enxerga o cookie. O filtro manda para cá antes de recusar: reconferimos o papel no banco, gravamos o cookie novo e voltamos ao
 * painel. Quem não é administrador no banco vai para a loja (nunca de volta ao painel, para não dar volta em círculo).
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const requested = request.nextUrl.searchParams.get("next") ?? "/admin";
  // Só caminhos do próprio painel (nada de endereço externo).
  const next = /^\/admin(\/[A-Za-z0-9\-_/]*)?$/.test(requested) ? requested : "/admin";

  const session = await auth();
  if (!session?.user) {
    const login = new URL("/login", origin);
    login.searchParams.set("callbackUrl", next);
    return NextResponse.redirect(login);
  }

  try {
    await unstable_update({});
  } catch (error) {
    console.error("[auth] não foi possível renovar o cookie de login", error);
  }
  const fresh = await auth();
  if (fresh?.user?.role === "admin") {
    const target = new URL(next, origin);
    target.searchParams.set("r", "1");
    return NextResponse.redirect(target);
  }
  return NextResponse.redirect(new URL("/", origin));
}
