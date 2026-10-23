import { escapeHtml, sendEmail } from "@/lib/email";
import { getStoreRules } from "@/server/store-rules";

/**
 * Avisa o dono da loja por e-mail (novo pedido, pagamento aprovado, problema que exige atenção).
 * Usa o e-mail das Regras da loja (painel); sem ele, STORE_CONTACT_EMAIL; sem nenhum, só registra no log. Nunca lança: um aviso que falha não pode
 * derrubar o checkout nem o webhook.
 */
export async function notifyOwner(subject: string, lines: string[]): Promise<void> {
  const to = (await getStoreRules()).owner.email || process.env.STORE_CONTACT_EMAIL;
  const cleanSubject = subject.replace(/[\r\n]+/g, " ").slice(0, 150);
  if (!to) {
    console.warn("[aviso ao dono] STORE_CONTACT_EMAIL não configurado:", cleanSubject, lines.join(" | "));
    return;
  }
  try {
    await sendEmail({
      to,
      subject: cleanSubject,
      html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#111;">${lines
        .map((line) => `<p style="margin:0 0 8px;">${escapeHtml(line)}</p>`)
        .join("")}</div>`,
    });
  } catch (error) {
    console.error("[aviso ao dono] falha ao enviar", error);
  }
}
