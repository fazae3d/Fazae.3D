"use client";

import { useRouter } from "next/navigation";
import { markQuoteFollowUpAction } from "@/app/admin/orcamentos/actions";
import { OpenInConversas } from "@/components/admin/open-in-conversas";
import { useToast } from "@/components/admin/toast";
import { formatPrice } from "@/lib/format";
import { formatStoreDate, quoteNumberLabel } from "@/lib/quote";

/** Abre a conversa no painel com a mensagem de acompanhamento já escrita e registra o contato. */
export function QuoteFollowUpButton({
  quote,
  publicUrl,
}: {
  quote: { id: string; number: number; token: string; customerName: string; customerPhone?: string; total: number; validUntil: string };
  publicUrl: string;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const first = quote.customerName.trim().split(/\s+/)[0] || "tudo bem";
  const message = `Oi, ${first}! Passando para saber se você conseguiu ver o orçamento ${quoteNumberLabel(quote.number)} (${formatPrice(quote.total)}). Ele vale até ${formatStoreDate(quote.validUntil)}. Posso ajustar alguma coisa para você? ${publicUrl}/orcamento/${quote.token}`;

  return (
    <OpenInConversas
      phone={quote.customerPhone}
      name={quote.customerName}
      text={message}
      beforeOpen={async () => {
        const result = await markQuoteFollowUpAction(quote.id);
        if (!result.success) toast(result.error, "error");
        else router.refresh();
      }}
      className="shrink-0 rounded-lg bg-petrol px-3.5 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
    >
      Chamar no Conversas
    </OpenInConversas>
  );
}
