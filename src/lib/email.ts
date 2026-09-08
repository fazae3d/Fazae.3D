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

/**
 * No-ops (logs and returns success:false) when RESEND_API_KEY isn't set, so
 * every dev/demo environment keeps working without a real provider — set
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
    console.warn(`[email] RESEND_API_KEY não configurado — e-mail para ${to} ("${subject}") não foi enviado.`);
    return { success: false, error: "Envio de e-mail não configurado." };
  }

  try {
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
    return { success: true };
  } catch (error) {
    console.error("[email] falha ao enviar", error);
    return { success: false, error: "Falha ao enviar e-mail." };
  }
}
