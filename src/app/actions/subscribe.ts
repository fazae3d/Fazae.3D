"use server";

import { z } from "zod";
import { escapeHtml, sendEmail } from "@/lib/email";
import { getEmailContactUrl, renderEmailLayout } from "@/lib/email-template";
import { UNSUBSCRIBE_PURPOSE } from "@/lib/reminder-unsubscribe";
import { SITE_URL } from "@/lib/site-config";
import { getClientIp, rateLimit } from "@/server/rate-limit";
import { findCoupon } from "@/server/repositories/coupon-repository";
import { upsertSubscriber } from "@/server/repositories/subscriber-repository";
import { createSignedToken } from "@/server/signed-token";

const schema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  name: z.string().trim().max(80).optional(),
  source: z.enum(["rodape", "home", "checkout"]),
});

export type SubscribeResult = { success: true; message: string } | { success: false; error: string };

/**
 * Inscrição em novidades e ofertas. O ato de enviar o formulário (ou marcar a caixa do checkout) é o consentimento:
 * guardamos e-mail, origem e data. Todo e-mail enviado depois leva o link para cancelar.
 */
export async function subscribeAction(input: unknown): Promise<SubscribeResult> {
  const limited = await rateLimit(`subscribe:${await getClientIp()}`, 6, 30 * 60 * 1000);
  if (!limited.allowed) return { success: false, error: "Muitas tentativas. Tente de novo em alguns minutos." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const { email, name, source } = parsed.data;

  try {
    const { created } = await upsertSubscriber({ email, name: name || undefined, source });
    if (created) {
      const coupon = await findCoupon("FAZAE10").catch(() => undefined);
      const couponHtml = coupon && coupon.active
        ? `<p style="margin:14px 0 0;padding:12px 14px;background:#f1ffd0;border-left:4px solid #b6ff00;">Seu cupom de primeira compra: <strong>${escapeHtml(coupon.code)}</strong>. É só colocar no carrinho.</p>`
        : "";
      const unsubscribeUrl = `${SITE_URL}/cancelar-lembretes?token=${createSignedToken(UNSUBSCRIBE_PURPOSE, email, null)}`;
      await sendEmail({
        to: email,
        subject: "Bem-vindo à Fazaê 3D",
        html: renderEmailLayout({
          preheader: "Novidades, lançamentos e ofertas da Fazaê",
          eyebrow: "Novidades",
          greeting: name ? `Oi, ${escapeHtml(name.split(" ")[0])}!` : "Oi!",
          heading: "Que bom ter você por aqui",
          bodyHtml: `<p style="margin:0;">A partir de agora você recebe, de vez em quando, lançamentos de peças, ofertas e dicas da Fazaê 3D. Sem exagero e sem spam.</p>${couponHtml}<p style="margin:20px 0 0;font-size:12px;color:#A6A6A0;">Não quer mais receber? <a href="${unsubscribeUrl}" style="color:#A6A6A0;">Cancelar</a> quando quiser.</p>`,
          action: { label: "Ver a loja", url: `${SITE_URL}/loja` },
          contactUrl: await getEmailContactUrl(),
        }),
      });
    }
    return { success: true, message: "Pronto! Enviamos um e-mail de boas-vindas para você." };
  } catch (error) {
    console.error("[subscribe] falha", error);
    return { success: false, error: "Não foi possível concluir agora. Tente de novo em instantes." };
  }
}
