"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { markQuoteFollowUpAction } from "@/app/admin/orcamentos/actions";
import { useToast } from "@/components/admin/toast";
import { formatPrice } from "@/lib/format";
import { formatStoreDate, quoteNumberLabel } from "@/lib/quote";

/** "123 → 55123": o wa.me precisa do DDI; números sem telefone abrem o WhatsApp sem destinatário. */
function whatsappDigits(phone?: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length <= 11 ? `55${digits}` : digits;
}

/** Abre o WhatsApp com a mensagem de acompanhamento pronta e registra o contato. */
export function QuoteFollowUpButton({
  quote,
  publicUrl,
}: {
  quote: { id: string; number: number; token: string; customerName: string; customerPhone?: string; total: number; validUntil: string };
  publicUrl: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const send = () => {
    const first = quote.customerName.trim().split(/\s+/)[0] || "tudo bem";
    const message = `Oi, ${first}! Passando para saber se você conseguiu ver o orçamento ${quoteNumberLabel(quote.number)} (${formatPrice(quote.total)}). Ele vale até ${formatStoreDate(quote.validUntil)}. Posso ajustar alguma coisa para você? ${publicUrl}/orcamento/${quote.token}`;
    window.open(`https://wa.me/${whatsappDigits(quote.customerPhone)}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
    startTransition(async () => {
      const result = await markQuoteFollowUpAction(quote.id);
      if (!result.success) {
        toast(result.error, "error");
        return;
      }
      toast("Contato registrado");
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={send}
      disabled={pending}
      className="shrink-0 rounded-lg bg-petrol px-3.5 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      Chamar no WhatsApp
    </button>
  );
}
