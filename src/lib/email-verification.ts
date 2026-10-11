import { sendEmail } from "@/lib/email";
import { getEmailContactUrl, renderEmailLayout } from "@/lib/email-template";
import { firstName } from "@/lib/format";
import { SITE_URL } from "@/lib/site-config";
import { createSignedToken } from "@/server/signed-token";

export const VERIFY_PURPOSE = "verify-email";
const VERIFY_TTL_MS = 3 * 24 * 60 * 60 * 1000;

/** Envia o link para a pessoa confirmar que o e-mail é dela. */
export async function sendVerificationEmail(email: string, name: string) {
  const token = createSignedToken(VERIFY_PURPOSE, email, VERIFY_TTL_MS);
  return sendEmail({
    to: email,
    subject: "Confirme seu e-mail na Fazaê",
    html: renderEmailLayout({
      preheader: "Falta só confirmar o seu e-mail.",
      eyebrow: "Sua conta",
      greeting: `E aí, ${firstName(name)}!`,
      heading: "Confirma seu e-mail pra gente?",
      bodyHtml: `<p style="margin:0 0 4px;">Sua conta foi criada! Falta só confirmar que este e-mail é seu. Assim você vê o histórico dos seus pedidos com segurança.</p><p style="margin:0;color:#A6A6A0;">Se não foi você, é só ignorar este e-mail.</p>`,
      action: { label: "Confirmar e-mail", url: `${SITE_URL}/verificar-email?token=${token}` },
      contactUrl: await getEmailContactUrl(),
    }),
  });
}
