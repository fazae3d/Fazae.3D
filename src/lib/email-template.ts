import { escapeHtml } from "@/lib/email";
import { DEFAULT_WHATSAPP_NUMBER, INSTAGRAM_URL, SITE_NAME, SITE_TAGLINE, SITE_URL, getWhatsAppLink } from "@/lib/site-config";
import { getSettings } from "@/server/repositories/settings-repository";
import { withReadFallback } from "@/lib/db-fallback";

/**
 * Brand colors mirrored from src/app/globals.css (@theme tokens) — email
 * HTML can't reference CSS custom properties reliably across clients, so
 * these are the same hex values copy-pasted, not re-derived.
 */
const COLORS = {
  ink: "#111111",
  paper: "#F4F4F0",
  graphite: "#A6A6A0",
  petrol: "#B6FF00",
  sand: "#4D6B32",
  border: "#E5E5E0",
  card: "#FAFAF8",
};

export type EmailAction = { label: string; url: string };

/**
 * WhatsApp link for the "Fale conosco" header button — reads the real
 * number from Settings (same source /admin/configuracoes edits), same
 * fallback pattern as footer.tsx/whatsapp-float-button.tsx. Call once per
 * e-mail send and pass the result in as `contactUrl`.
 */
export async function getEmailContactUrl(): Promise<string> {
  const { whatsappNumber } = await withReadFallback(() => getSettings(), {
    freeShippingThreshold: 299.9,
    whatsappNumber: DEFAULT_WHATSAPP_NUMBER,
  });
  return getWhatsAppLink(whatsappNumber);
}

/**
 * This design is meant to render exactly as authored, in light mode, every
 * time — it's the brand's own dark header/light card combo, not something
 * that should get reprocessed by a client's dark-mode heuristics. Gmail's
 * apps in particular repaint colors it doesn't recognize as "dark mode
 * declared" (flipping the already-dark header to white, the white card to
 * near-black, and muddying the lime accent) unless the document opts out
 * explicitly *and* every color-bearing element restates itself under
 * `prefers-color-scheme: dark` / Gmail's own `[data-ogsc]` attribute — the
 * meta tags alone aren't reliably honored by the Gmail apps. `fz-*` classes
 * below exist only so this block can re-target the same colors there.
 */
function darkModeGuardStyle(): string {
  const rules = [
    [".fz-bg-page", "background-color", COLORS.paper],
    [".fz-bg-card", "background-color", "#ffffff"],
    [".fz-bg-ink", "background-color", COLORS.ink],
    [".fz-bg-petrol", "background-color", COLORS.petrol],
    [".fz-bg-soft", "background-color", COLORS.card],
    [".fz-text-ink", "color", COLORS.ink],
    [".fz-text-graphite", "color", COLORS.graphite],
    [".fz-text-sand", "color", COLORS.sand],
    [".fz-text-petrol", "color", COLORS.petrol],
  ] as const;

  const block = rules.map(([selector, prop, value]) => `${selector}{${prop}:${value} !important;}`).join("");

  return `
    <style>
      :root { color-scheme: light; supported-color-schemes: light; }
      ${block}
      @media (prefers-color-scheme: dark) { ${block} }
      ${block.replace(/\./g, "[data-ogsc] .")}
    </style>`;
}

/**
 * Wraps a fragment of body HTML in the branded shell every transactional
 * e-mail shares: dark header with the real site logo and a "Fale conosco"
 * WhatsApp link, a light content card for legible copy, and a dark footer
 * echoing the site's own tagline/Instagram. `eyebrow` is the small caps
 * label above the heading (mirrors the site's own "label-caps" convention).
 */
export function renderEmailLayout({
  preheader,
  eyebrow,
  greeting,
  heading,
  bodyHtml,
  action,
  contactUrl,
}: {
  /** Hidden preview text shown in the inbox list, before the e-mail is opened. */
  preheader: string;
  eyebrow: string;
  /** Friendly opening line, e.g. "E aí, Marina!" — rendered above the heading. */
  greeting: string;
  heading: string;
  bodyHtml: string;
  action?: EmailAction;
  /** WhatsApp link for the header's "Fale conosco" button — get it from getEmailContactUrl(). */
  contactUrl: string;
}): string {
  const actionHtml = action
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:28px;">
        <tr>
          <td class="fz-bg-petrol" bgcolor="${COLORS.petrol}" style="background-color:${COLORS.petrol};border-radius:999px;">
            <a href="${escapeHtml(action.url)}" class="fz-text-ink" style="display:inline-block;padding:14px 30px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${COLORS.ink};text-decoration:none;font-family:Arial,Helvetica,sans-serif;">
              ${escapeHtml(action.label)}
            </a>
          </td>
        </tr>
      </table>`
    : "";

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escapeHtml(SITE_NAME)}</title>
    ${darkModeGuardStyle()}
  </head>
  <body class="fz-bg-page" style="margin:0;padding:0;background-color:${COLORS.paper};font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="fz-bg-page" bgcolor="${COLORS.paper}" style="background-color:${COLORS.paper};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="fz-bg-card" bgcolor="#ffffff" style="max-width:560px;background-color:#ffffff;">
            <tr>
              <td class="fz-bg-ink" bgcolor="${COLORS.ink}" style="background-color:${COLORS.ink};padding:22px 28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="left" valign="middle">
                      <img src="${SITE_URL}/logo-header.png" alt="${escapeHtml(SITE_NAME)}" height="24" style="height:24px;width:auto;border:0;display:block;" />
                    </td>
                    <td align="right" valign="middle">
                      <a href="${escapeHtml(contactUrl)}" class="fz-text-petrol" style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${COLORS.petrol};text-decoration:none;font-family:Arial,Helvetica,sans-serif;">
                        Fale conosco
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="fz-bg-petrol" bgcolor="${COLORS.petrol}" style="background-color:${COLORS.petrol};font-size:0;line-height:0;height:4px;">&nbsp;</td>
            </tr>
            <tr>
              <td class="fz-bg-card" bgcolor="#ffffff" style="background-color:#ffffff;padding:40px 32px;">
                <p class="fz-text-sand" style="margin:0 0 14px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${COLORS.sand};font-family:Arial,Helvetica,sans-serif;">
                  ${escapeHtml(eyebrow)}
                </p>
                <p class="fz-text-ink" style="margin:0 0 4px;font-size:15px;color:${COLORS.ink};font-family:Arial,Helvetica,sans-serif;">
                  ${escapeHtml(greeting)}
                </p>
                <h1 class="fz-text-ink" style="margin:0 0 20px;font-size:24px;line-height:1.3;color:${COLORS.ink};font-family:Arial,Helvetica,sans-serif;">
                  ${escapeHtml(heading)}
                </h1>
                <div class="fz-text-ink" style="font-size:15px;line-height:1.7;color:${COLORS.ink};font-family:Arial,Helvetica,sans-serif;">
                  ${bodyHtml}
                </div>
                ${actionHtml}
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:32px;">
                  <tr>
                    <td class="fz-text-graphite" style="border-top:1px solid ${COLORS.border};padding-top:16px;font-size:13px;color:${COLORS.graphite};font-style:italic;font-family:Arial,Helvetica,sans-serif;">
                      Com carinho, equipe ${escapeHtml(SITE_NAME)} 💚
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="fz-bg-ink" bgcolor="${COLORS.ink}" style="background-color:${COLORS.ink};padding:24px 32px;text-align:center;">
                <p class="fz-text-graphite" style="margin:0 0 6px;font-size:12px;color:${COLORS.graphite};font-family:Arial,Helvetica,sans-serif;">
                  ${escapeHtml(SITE_NAME)} · ${escapeHtml(SITE_TAGLINE)}
                </p>
                <p style="margin:0;font-size:12px;font-family:Arial,Helvetica,sans-serif;">
                  <a href="${escapeHtml(INSTAGRAM_URL)}" class="fz-text-petrol" style="color:${COLORS.petrol};text-decoration:none;">Instagram</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Renders an order's line items as a small card-style list, used by both the confirmation and (optionally) status e-mails. */
export function renderOrderItemsTable(
  items: { name: string; material: string; color: string; quantity: number; price: number }[],
  formatPrice: (value: number) => string,
): string {
  const rows = items
    .map(
      (item, i) => `
      <tr>
        <td class="fz-bg-soft fz-text-ink" style="padding:12px 16px;${i > 0 ? `border-top:1px solid ${COLORS.border};` : ""}font-size:14px;color:${COLORS.ink};background-color:${COLORS.card};">
          ${item.quantity}× ${escapeHtml(item.name)}
          <span class="fz-text-graphite" style="color:${COLORS.graphite};">(${escapeHtml(item.material)}, ${escapeHtml(item.color)})</span>
        </td>
        <td class="fz-bg-soft fz-text-ink" style="padding:12px 16px;${i > 0 ? `border-top:1px solid ${COLORS.border};` : ""}font-size:14px;color:${COLORS.ink};background-color:${COLORS.card};text-align:right;white-space:nowrap;">
          ${escapeHtml(formatPrice(item.price * item.quantity))}
        </td>
      </tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${COLORS.card}" style="margin:18px 0;background-color:${COLORS.card};border-radius:10px;overflow:hidden;">${rows}</table>`;
}

/** Highlighted total row — a small colored strip that makes the number the first thing the eye lands on. */
export function renderTotalHighlight(label: string, value: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${COLORS.paper}" style="margin:4px 0 0;background-color:${COLORS.paper};border-radius:10px;border-left:4px solid ${COLORS.petrol};">
    <tr>
      <td class="fz-bg-page fz-text-ink" style="padding:14px 16px;font-size:15px;color:${COLORS.ink};background-color:${COLORS.paper};font-family:Arial,Helvetica,sans-serif;">
        ${escapeHtml(label)} <strong>${escapeHtml(value)}</strong>
      </td>
    </tr>
  </table>`;
}
