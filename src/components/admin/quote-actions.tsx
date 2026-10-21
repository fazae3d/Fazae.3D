"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/select";
import { AdminIcon } from "@/components/admin/admin-icons";
import { useToast } from "@/components/admin/toast";
import {
  convertQuoteToOrderAction,
  sendQuoteViaConversationAction,
  deleteQuoteAction,
  duplicateQuoteAction,
  emailQuoteAction,
  markQuoteSentAction,
  setQuoteStatusAction,
} from "@/app/admin/orcamentos/actions";
import { quoteNumberLabel, quoteWhatsAppMessage, validityFromNow, DEFAULT_QUOTE_VALIDITY_DAYS, type QuoteStatus } from "@/lib/quote";

const BTN = "flex items-center gap-1.5 rounded-lg border border-mist px-3.5 py-2 text-sm transition-colors hover:border-petrol disabled:opacity-60";
const BTN_PRIMARY = "flex items-center gap-1.5 rounded-lg bg-petrol px-3.5 py-2 text-sm font-semibold text-[#111] transition-opacity hover:opacity-90 disabled:opacity-60";

/** "(84) 99999-9999" → "5584999999999" (adiciona o 55 quando falta). */
function whatsappDigits(phone?: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.length <= 11 ? `55${digits}` : digits;
}

export function QuoteActions({
  quote,
  publicUrl,
}: {
  quote: {
    id: string;
    number: number;
    token: string;
    status: QuoteStatus;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    total: number;
    /** Quanto o cliente economiza (desconto + frete grátis): vira argumento na mensagem. */
    savings?: number;
    freeShipping?: boolean;
    validUntil: string;
    linkedOrderId?: string;
  };
  publicUrl: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [payment, setPayment] = useState<"pix" | "cartao" | "boleto">("pix");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const label = quoteNumberLabel(quote.number);
  const link = `${publicUrl}/orcamento/${quote.token}`;
  const pdfHref = `/orcamento/${quote.token}/pdf`;

  const run = (task: () => Promise<{ success: boolean; error?: string }>, okMessage: string) => {
    startTransition(async () => {
      const result = await task();
      if (!result.success) {
        toast(result.error ?? "Não foi possível concluir.", "error");
        return;
      }
      toast(okMessage);
      router.refresh();
    });
  };

  const sendWhatsApp = () => {
    const message = quoteWhatsAppMessage({ ...quote, link });
    const digits = whatsappDigits(quote.customerPhone);
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
    void markQuoteSentAction(quote.id).then(() => router.refresh());
  };

  const sendViaConversations = () => {
    startTransition(async () => {
      const result = await sendQuoteViaConversationAction(quote.id);
      if (!result.success) {
        toast(result.error, "error");
        return;
      }
      toast("Orçamento enviado pelo Conversas");
      router.push(`/admin/conversas?c=${result.conversationId}`);
    });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast("Link copiado");
    } catch {
      toast("Não consegui copiar. Selecione o link manualmente.", "error");
    }
  };

  const closed = Boolean(quote.linkedOrderId);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <a href={pdfHref} target="_blank" rel="noopener noreferrer" className={BTN_PRIMARY}>
          <AdminIcon name="download" className="h-4 w-4" /> Baixar PDF
        </a>
        <button
          type="button"
          disabled={pending || !whatsappDigits(quote.customerPhone)}
          title={whatsappDigits(quote.customerPhone) ? "Envia a mensagem pelo número da loja e abre a conversa no painel" : "Cadastre o telefone do cliente para enviar"}
          onClick={sendViaConversations}
          className={BTN}
        >
          <AdminIcon name="send" className="h-4 w-4" /> Enviar pelo Conversas
        </button>
        <button type="button" onClick={sendWhatsApp} className={BTN}>
          <AdminIcon name="send" className="h-4 w-4" /> Abrir no WhatsApp
        </button>
        <button
          type="button"
          disabled={pending || !quote.customerEmail}
          title={quote.customerEmail ? undefined : "Cadastre o e-mail do cliente para enviar"}
          onClick={() => run(() => emailQuoteAction(quote.id), "E-mail enviado")}
          className={BTN}
        >
          <AdminIcon name="send" className="h-4 w-4" /> Enviar por e-mail
        </button>
        <button type="button" onClick={copyLink} className={BTN}>
          <AdminIcon name="copy" className="h-4 w-4" /> Copiar link
        </button>
        {!closed && (
          <Link href={`/admin/orcamentos/${quote.id}/editar`} className={BTN}>
            Editar
          </Link>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const result = await duplicateQuoteAction(quote.id, validityFromNow(DEFAULT_QUOTE_VALIDITY_DAYS));
              if (!result.success) {
                toast(result.error, "error");
                return;
              }
              toast("Cópia criada como rascunho");
              router.push(`/admin/orcamentos/${result.id}/editar`);
            });
          }}
          className={BTN}
        >
          Duplicar
        </button>
      </div>

      {!closed && (
        <div className="admin-card rounded-xl border border-mist p-4">
          <p className="mb-3 text-sm font-semibold">Resposta do cliente</p>
          <div className="flex flex-wrap items-center gap-2">
            {quote.status !== "aprovado" && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-40">
                  <Select
                    value={payment}
                    onChange={(v) => setPayment(v as "pix" | "cartao" | "boleto")}
                    options={[
                      { value: "pix", label: "Pago via Pix" },
                      { value: "cartao", label: "Pago no cartão" },
                      { value: "boleto", label: "Boleto" },
                    ]}
                    className="rounded-lg border border-mist bg-transparent px-3 py-2 text-sm focus:border-petrol"
                  />
                </div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await convertQuoteToOrderAction(quote.id, payment);
                      if (!result.success) {
                        toast(result.error, "error");
                        return;
                      }
                      toast("Pedido criado e enviado para a produção");
                      router.refresh();
                    })
                  }
                  className={BTN_PRIMARY}
                >
                  Aprovado: converter em pedido
                </button>
              </div>
            )}
            {quote.status !== "recusado" && (
              <button type="button" disabled={pending} onClick={() => run(() => setQuoteStatusAction(quote.id, "recusado"), "Marcado como recusado")} className={BTN}>
                Cliente recusou
              </button>
            )}
            {(quote.status === "recusado" || quote.status === "aprovado") && (
              <button type="button" disabled={pending} onClick={() => run(() => setQuoteStatusAction(quote.id, "enviado"), "Voltou para enviado")} className={BTN}>
                Reabrir
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-graphite">
            Ao converter, o orçamento vira um pedido (canal WhatsApp) já na fila de produção. O estoque não é alterado.
          </p>
        </div>
      )}

      {closed && (
        <div className="admin-card rounded-xl border border-petrol/40 p-4 text-sm">
          Esse orçamento já virou o pedido{" "}
          <Link href={`/admin/pedidos?q=${quote.linkedOrderId}`} className="font-semibold text-petrol underline underline-offset-2">
            {quote.linkedOrderId}
          </Link>
          .
        </div>
      )}

      <div>
        {confirmDelete ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-graphite">Excluir este orçamento de vez?</span>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteQuoteAction(quote.id);
                  if (!result.success) {
                    toast(result.error, "error");
                    return;
                  }
                  toast("Orçamento excluído");
                  router.push("/admin/orcamentos");
                })
              }
              className="rounded-lg border border-red-500/60 px-3 py-1.5 text-red-400 hover:bg-red-500/10"
            >
              Sim, excluir
            </button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="text-graphite hover:text-ink">
              Cancelar
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-sm text-graphite transition-colors hover:text-red-400">
            <AdminIcon name="trash" className="h-4 w-4" /> Excluir orçamento
          </button>
        )}
      </div>
    </div>
  );
}
