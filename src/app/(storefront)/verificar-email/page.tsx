import type { Metadata } from "next";
import { ButtonLink } from "@/components/button";
import { VERIFY_PURPOSE } from "@/lib/email-verification";
import { readSignedToken } from "@/server/signed-token";
import { markEmailVerified } from "@/server/repositories/user-repository";

export const metadata: Metadata = {
  title: "Confirmar e-mail",
  robots: { index: false, follow: false },
};

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const data = token ? readSignedToken(token, VERIFY_PURPOSE) : null;

  let ok = false;
  if (data) {
    try {
      await markEmailVerified(data.email);
      ok = true;
    } catch (error) {
      console.error("[verificar-email] falha ao confirmar", error);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <h1 className="font-display text-3xl sm:text-4xl">{ok ? "E-mail confirmado!" : "Link inválido ou expirado"}</h1>
      <p className="mt-4 text-graphite">
        {ok
          ? "Pronto, agora você já pode ver seus pedidos na sua conta."
          : "Entre na sua conta e peça um novo link de confirmação em Meus pedidos."}
      </p>
      <ButtonLink href={ok ? "/conta/pedidos" : "/login"} variant="primary" className="mt-8 inline-flex">
        {ok ? "Ver meus pedidos" : "Entrar"}
      </ButtonLink>
    </div>
  );
}
