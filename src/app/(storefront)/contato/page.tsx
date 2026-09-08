import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { ContactForm } from "@/components/contact-form";
import { DEFAULT_WHATSAPP_NUMBER, getWhatsAppLink } from "@/lib/site-config";
import { getSettings } from "@/server/repositories/settings-repository";
import { withReadFallback } from "@/lib/db-fallback";

export const metadata: Metadata = {
  title: "Contato",
};

export default async function ContatoPage() {
  // TODO(fase DB): remove o fallback quando a Fazaê tiver o próprio banco — hoje a leitura real falharia sem Supabase configurado.
  const { whatsappNumber } = await withReadFallback(() => getSettings(), {
    freeShippingThreshold: 299.9,
    whatsappNumber: DEFAULT_WHATSAPP_NUMBER,
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Contato" }]} />
      <h1 className="font-display mb-3 text-3xl sm:text-4xl">Fale com a Fazaê</h1>
      <p className="mb-6 text-graphite">
        Dúvidas sobre pedidos, materiais ou uma ideia pra imprimir? Envie sua mensagem.
      </p>

      <a
        href={getWhatsAppLink(whatsappNumber)}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-10 flex items-center gap-3 border border-paper/15 p-4 text-sm transition-colors hover:border-petrol"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#25D366] text-paper">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.87.52 3.63 1.42 5.14L2 22l5.09-1.53a9.87 9.87 0 0 0 4.95 1.34h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2Zm5.8 14.05c-.24.68-1.41 1.3-1.94 1.35-.53.05-1.03.24-3.47-.72-2.94-1.17-4.83-4.02-4.98-4.24-.15-.22-1.19-1.6-1.19-3.05 0-1.45.76-2.16 1.03-2.46.27-.29.6-.36.8-.36.2 0 .4 0 .58.01.19.01.44-.07.68.53.24.61.83 2.03.9 2.18.07.15.12.32.02.51-.1.19-.15.31-.29.48-.15.17-.31.38-.44.51-.15.15-.3.31-.13.6.17.29.76 1.25 1.63 2.02 1.12 1 2.06 1.31 2.36 1.46.3.15.48.13.65-.05.18-.19.75-.87.96-1.17.2-.29.4-.24.68-.15.27.1 1.73.82 2.03.97.29.15.49.22.56.35.07.13.07.75-.17 1.43Z" />
          </svg>
        </span>
        <span>
          <span className="block text-paper">Prefere falar por WhatsApp?</span>
          <span className="block text-xs text-graphite">Resposta mais rápida para dúvidas de material e prazo.</span>
        </span>
      </a>

      <ContactForm />
    </div>
  );
}
