/** Placeholder production domain — update when the real domain is confirmed. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.fazae3d.com.br";
export const SITE_NAME = "Fazaê";
export const SITE_TAGLINE = "Você imagina. A gente cria.";

/** Temporary static value while the store's Settings model isn't wired to a Fazaê database yet — see /admin/configuracoes once that phase lands. */
export const DEFAULT_WHATSAPP_NUMBER = "5584999999999";

/** Aviso mostrado junto do Pix: o recebedor aparece com o nome do titular do MEI, não "Fazaê" (regra do Banco Central, não dá para trocar). */
export const PIX_RECEIVER_NOTICE =
  "No Pix, o nome do recebedor pode aparecer diferente de Fazaê. Isso acontece porque ainda somos MEI e o Pix sai no nome do nosso titular. Pode pagar tranquilo, o pagamento é nosso e é seguro.";

/**
 * Dados da empresa exibidos no rodapé e nas páginas legais (Decreto 7.962/2013 exige identificar o fornecedor).
 * O CNPJ entra assim que for definido (NEXT_PUBLIC_COMPANY_CNPJ na Vercel, ou direto aqui); vazio = não é exibido.
 */
export const COMPANY = {
  legalName: "Fazaê 3D",
  cnpj: process.env.NEXT_PUBLIC_COMPANY_CNPJ ?? "",
  address: "Rua Luís Nogueira Filho, 419 - Nova Esperança, Parnamirim/RN",
  zip: "59144-336",
};

/** "Fazaê 3D · CNPJ 00.000.000/0001-00 · Rua ..., Parnamirim/RN · CEP 59144-336" (sem o CNPJ enquanto não houver). */
export function companyIdentification() {
  return [COMPANY.legalName, COMPANY.cnpj ? `CNPJ ${COMPANY.cnpj}` : null, COMPANY.address, `CEP ${COMPANY.zip}`]
    .filter(Boolean)
    .join(" · ");
}

export const INSTAGRAM_URL = "https://instagram.com/fazae.3d";

const DEFAULT_WHATSAPP_MESSAGE = "Olá! Tenho uma ideia para imprimir em 3D.";

export function getWhatsAppLink(whatsappNumber: string = DEFAULT_WHATSAPP_NUMBER, message: string = DEFAULT_WHATSAPP_MESSAGE) {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
