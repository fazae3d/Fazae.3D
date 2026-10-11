import type { Metadata } from "next";
import { ButtonLink } from "@/components/button";
import { UNSUBSCRIBE_PURPOSE } from "@/lib/reminder-unsubscribe";
import { readSignedToken } from "@/server/signed-token";
import { optOutOfReminders } from "@/server/repositories/abandoned-cart-repository";

export const metadata: Metadata = {
  title: "Cancelar lembretes",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const data = token ? readSignedToken(token, UNSUBSCRIBE_PURPOSE) : null;

  let ok = false;
  if (data) {
    try {
      await optOutOfReminders(data.email);
      ok = true;
    } catch (error) {
      console.error("[cancelar-lembretes] falha", error);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <h1 className="font-display text-3xl sm:text-4xl">{ok ? "Lembretes cancelados" : "Link inválido"}</h1>
      <p className="mt-4 text-graphite">
        {ok
          ? "Pronto, você não vai mais receber lembretes de carrinho da Fazaê. Seus pedidos continuam normais."
          : "Não conseguimos validar este link. Se quiser parar de receber, fale com a gente pelo WhatsApp."}
      </p>
      <ButtonLink href="/loja" variant="primary" className="mt-8 inline-flex">
        Ver produtos
      </ButtonLink>
    </div>
  );
}
