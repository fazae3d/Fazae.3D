import { getSettings } from "@/server/repositories/settings-repository";
import { getQuoteByToken } from "@/server/repositories/quote-repository";
import { renderQuotePdf } from "@/lib/quote-pdf";
import { quoteNumberLabel } from "@/lib/quote";
import { DEFAULT_WHATSAPP_NUMBER } from "@/lib/site-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PDF do orçamento. Quem tem o link (token impossível de adivinhar) pode baixar; o painel usa o mesmo endereço. */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const quote = await getQuoteByToken(token).catch(() => undefined);
  if (!quote) return new Response("Orçamento não encontrado.", { status: 404 });

  const settings = await getSettings().catch(() => null);
  const pdf = await renderQuotePdf(quote, { whatsappNumber: settings?.whatsappNumber ?? DEFAULT_WHATSAPP_NUMBER, company: settings?.rules.company });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quoteNumberLabel(quote.number)}-fazae-3d.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
