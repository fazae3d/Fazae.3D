import { escapeHtml } from "@/lib/email";
import { renderEmailLayout } from "@/lib/email-template";

export type CampaignContent = {
  subject: string;
  heading: string;
  body: string;
  buttonLabel?: string;
  buttonUrl?: string;
};

/** Texto simples → HTML seguro: linha em branco separa parágrafos; blocos em que toda linha começa com "- " viram lista. */
export function campaignBodyHtml(text: string): string {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  return blocks
    .map((block) => {
      const lines = block.split("\n").map((line) => line.trim());
      if (lines.every((line) => /^[-•]\s+/.test(line))) {
        const items = lines.map((line) => `<li style="margin:0 0 6px;">${escapeHtml(line.replace(/^[-•]\s+/, ""))}</li>`).join("");
        return `<ul style="margin:0 0 16px;padding-left:20px;">${items}</ul>`;
      }
      return `<p style="margin:0 0 16px;">${lines.map(escapeHtml).join("<br />")}</p>`;
    })
    .join("");
}

/** Só endereços http(s) viram botão (nada de javascript: ou outros esquemas). */
export function isSafeButtonUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/** E-mail final de uma campanha para uma pessoa (com saudação e link para cancelar). */
export function buildCampaignHtml({
  content,
  recipientName,
  unsubscribeUrl,
  contactUrl,
}: {
  content: CampaignContent;
  recipientName?: string;
  unsubscribeUrl: string;
  contactUrl: string;
}): string {
  const first = recipientName?.trim().split(/\s+/)[0];
  const footer = `<p style="margin:24px 0 0;font-size:12px;color:#A6A6A0;">Você recebe este e-mail porque se inscreveu nas novidades da Fazaê 3D. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#A6A6A0;">Cancelar inscrição</a>.</p>`;
  return renderEmailLayout({
    preheader: content.heading,
    eyebrow: "Novidades",
    greeting: first ? `Oi, ${first}!` : "Oi!",
    heading: content.heading,
    bodyHtml: `${campaignBodyHtml(content.body)}${footer}`,
    action: content.buttonLabel && isSafeButtonUrl(content.buttonUrl) ? { label: content.buttonLabel, url: content.buttonUrl } : undefined,
    contactUrl,
  });
}
