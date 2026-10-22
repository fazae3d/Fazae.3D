"use server";

import { contactSchema } from "@/lib/validation";
import { escapeHtml, sendEmail } from "@/lib/email";
import { getClientIp, rateLimit } from "@/server/rate-limit";

export type ContactResult = { success: true } | { success: false; error: string };

export async function contactAction(input: unknown): Promise<ContactResult> {
  const limited = await rateLimit(`contact:${await getClientIp()}`, 5, 30 * 60 * 1000);
  if (!limited.allowed) return { success: false, error: "Muitas mensagens em pouco tempo. Tente de novo mais tarde." };

  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const storeEmail = process.env.STORE_CONTACT_EMAIL;
  if (!storeEmail) {
    console.error("[contato] STORE_CONTACT_EMAIL não configurado, mensagem não entregue");
    return { success: false, error: "Não foi possível enviar sua mensagem agora. Fale com a gente pelo WhatsApp." };
  }

  const { name, email, subject, message } = parsed.data;
  const result = await sendEmail({
    to: storeEmail,
    // Assunto é cabeçalho de e-mail, não HTML: só tira quebras de linha (evita injeção de cabeçalho).
    subject: `Contato pelo site: ${subject.replace(/[\r\n]+/g, " ").slice(0, 120)}`,
    html: `<p><strong>Nome:</strong> ${escapeHtml(name)}</p><p><strong>E-mail:</strong> ${escapeHtml(email)}</p><p><strong>Mensagem:</strong></p><p>${escapeHtml(message)}</p>`,
  });
  if (!result.success) {
    return { success: false, error: "Não foi possível enviar sua mensagem agora. Tente de novo ou fale pelo WhatsApp." };
  }

  return { success: true };
}
