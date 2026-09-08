"use server";

import { contactSchema } from "@/lib/validation";
import { escapeHtml, sendEmail } from "@/lib/email";

export type ContactResult = { success: true } | { success: false; error: string };

export async function contactAction(input: unknown): Promise<ContactResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const storeEmail = process.env.STORE_CONTACT_EMAIL;
  if (storeEmail) {
    const { name, email, subject, message } = parsed.data;
    await sendEmail({
      to: storeEmail,
      subject: `Contato pelo site: ${escapeHtml(subject)}`,
      html: `<p><strong>Nome:</strong> ${escapeHtml(name)}</p><p><strong>E-mail:</strong> ${escapeHtml(email)}</p><p><strong>Mensagem:</strong></p><p>${escapeHtml(message)}</p>`,
    });
  }

  return { success: true };
}
