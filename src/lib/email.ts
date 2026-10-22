import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Fazaê <onboarding@resend.dev>";

export type SendEmailResult = { success: true } | { success: false; error: string };

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escapes user-submitted text before interpolating it into an email's HTML body. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

export type BatchEmail = { to: string; subject: string; html: string };

/**
 * Envia vários e-mails de uma vez (até 100 por chamada, cada um com o seu próprio conteúdo): usado nas campanhas.
 * Devolve { success: false } se o Resend recusar o lote inteiro (cota diária, domínio não verificado...).
 */
export async function sendEmailBatch(emails: BatchEmail[]): Promise<SendEmailResult> {
  if (emails.length === 0) return { success: true };
  if (!resend) {
    console.warn("[email] RESEND_API_KEY não configurado: campanha não enviada.");
    return { success: false, error: "Envio de e-mail não configurado." };
  }
  try {
    const { error } = await resend.batch.send(emails.map((e) => ({ from: FROM_EMAIL, to: e.to, subject: e.subject, html: e.html })));
    if (error) {
      console.error("[email] Resend recusou o lote", error);
      return { success: false, error: error.message || "O serviço de e-mail recusou o envio." };
    }
    return { success: true };
  } catch (error) {
    console.error("[email] falha ao enviar lote", error);
    return { success: false, error: "Falha ao enviar o lote de e-mails." };
  }
}

/**
 * No-ops (logs and returns success:false) when RESEND_API_KEY isn't set, so
 * every dev/demo environment keeps working without a real provider, set
 * the key in production to actually send.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendEmailResult> {
  if (!resend) {
    console.warn(`[email] RESEND_API_KEY não configurado, e-mail para ${to} ("${subject}") não foi enviado.`);
    return { success: false, error: "Envio de e-mail não configurado." };
  }

  try {
    // O SDK do Resend não lança exceção em erro da API (domínio não verificado, cota, destinatário
    // inválido...): devolve { error }. Sem checar isso, falha de envio era tratada como sucesso.
    const { error } = await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
    if (error) {
      console.error("[email] Resend recusou o envio", { to, subject, error });
      return { success: false, error: "Falha ao enviar e-mail." };
    }
    return { success: true };
  } catch (error) {
    console.error("[email] falha ao enviar", error);
    return { success: false, error: "Falha ao enviar e-mail." };
  }
}
