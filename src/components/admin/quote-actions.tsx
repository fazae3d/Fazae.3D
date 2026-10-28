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
  sendQuotePdfViaConversationAction,
  deleteQuoteAction,
  duplicateQuoteAction,
  emailQuoteAction,
  markQuoteSentAction,
  setQuoteStatusAction,
} from "@/app/admin/orcamentos/actions";
import { QUOTE_LOSS_REASONS, isQuoteExpired, quoteLossLabel, quoteNumberLabel, quoteWhatsAppMessage, validityFromNow, type QuoteStatus } from "@/lib/quote";

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
  validityDays,
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
    lostReason?: string;
    lostNote?: string;
    /** Como o orçamento foi combinado: já sugere a forma de pagamento ao converter em pedido. */
    paymentMethod?: "pix" | "cartao";
  };
  publicUrl: string;
  /** Validade de um orçamento novo (duplicar), vinda das Regras da loja. */
  validityDays: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [payment, setPayment] = useState<"pix" | "cartao" | "boleto">(quote.paymentMethod === "cartao" ? "cartao" : "pix");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [losing, setLosing] = useState(false);
  const [lossReason, setLossReason] = useState("preco");
  const [lossNote, setLossNote] = useState("");
  const expired = isQuoteExpired(quote);

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

  const sendPdfViaConversations = () => {
    startTransition(async () => {
      const result = await sendQuotePdfViaConversationAction(quote.id);
      if (!result.success) {
        toast(result.error, "error");
        return;
      }
      toast("PDF enviado pelo Conversas");
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
        <button
          type="button"
          disabled={pending || !whatsappDigits(quote.customerPhone)}
          title="Envia o arquivo PDF do orçamento pelo número da loja"
          onClick={sendPdfViaConversations}
          className={BTN}
        >
          <AdminIcon name="send" className="h-4 w-4" /> Enviar PDF pelo Conversas
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
              const result = await duplicateQuoteAction(quote.id, validityFromNow(validityDays));
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
            {quote.status !== "recusado" && !losing && (
              <button type="button" disabled={pending} onClick={() => setLosing(true)} className={BTN}>
                {expired ? "Marcar como perdido" : "Cliente recusou"}
              </button>
            )}
            {(quote.status === "recusado" || quote.status === "aprovado") && (
              <button type="button" disabled={pending} onClick={() => run(() => setQuoteStatusAction(quote.id, "enviado"), "Voltou para enviado")} className={BTN}>
                Reabrir
              </button>
            )}
          </div>
          {losing && (
            <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-mist p-3">
              <label className="text-xs text-graphite">
                Por que perdeu?
                <div className="mt-1 w-60">
                  <Select
                    value={lossReason}
                    onChange={setLossReason}
                    options={QUOTE_LOSS_REASONS}
                    className="rounded-lg border border-mist bg-transparent px-3 py-2 text-sm text-ink focus:border-petrol"
                  />
                </div>
              </label>
              <label className="min-w-[200px] flex-1 text-xs text-graphite">
                Observação (opcional)
                <input
                  value={lossNote}
                  onChange={(e) => setLossNote(e.target.value)}
                  maxLength={300}
                  placeholder="Ex.: achou 30% mais barato em outro lugar"
                  className="mt-1 w-full rounded-lg border border-mist bg-transparent px-3 py-2 text-sm text-ink outline-none focus:border-petrol"
                />
              </label>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  run(() => setQuoteStatusAction(quote.id, "recusado", { reason: lossReason, note: lossNote }), "Perda registrada");
                  setLosing(false);
                }}
                className={BTN_PRIMARY}
              >
                Confirmar
              </button>
              <button type="button" onClick={() => setLosing(false)} className="text-sm text-graphite hover:text-ink">
                Cancelar
              </button>
            </div>
          )}
          {quote.status === "recusado" && (
            <p className="mt-3 text-sm text-graphite">
              Motivo da perda: <strong className="text-ink">{quoteLossLabel(quote.lostReason)}</strong>
              {quote.lostNote ? ` · ${quote.lostNote}` : ""}
            </p>
          )}
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
