/** Placeholder production domain — update when the real domain is confirmed. */
export const SITE_URL = "https://www.fazae3d.com.br";
export const SITE_NAME = "Fazaê";
export const SITE_TAGLINE = "Você imagina. A gente cria.";

/** Temporary static value while the store's Settings model isn't wired to a Fazaê database yet — see /admin/configuracoes once that phase lands. */
export const DEFAULT_WHATSAPP_NUMBER = "5584999999999";

/** Aviso mostrado junto do Pix: o recebedor aparece com o nome do titular do MEI, não "Fazaê" (regra do Banco Central, não dá para trocar). */
export const PIX_RECEIVER_NOTICE =
  "No Pix, o nome do recebedor pode aparecer diferente de Fazaê. Isso acontece porque ainda somos MEI e o Pix sai no nome do nosso titular. Pode pagar tranquilo, o pagamento é nosso e é seguro.";

export const INSTAGRAM_URL = "https://instagram.com/fazae.3d";

const DEFAULT_WHATSAPP_MESSAGE = "Olá! Tenho uma ideia para imprimir em 3D.";

export function getWhatsAppLink(whatsappNumber: string = DEFAULT_WHATSAPP_NUMBER, message: string = DEFAULT_WHATSAPP_MESSAGE) {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
