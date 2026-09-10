import Link from "next/link";
import { FlowLines } from "./flow-lines";
import { PaymentIcons } from "./payment-icons";
import { SecurityBadge } from "./security-badge";
import { DEFAULT_WHATSAPP_NUMBER, INSTAGRAM_URL, SITE_NAME, SITE_TAGLINE, getWhatsAppLink } from "@/lib/site-config";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2c-5.5 0-9.96 4.46-9.96 9.96 0 1.76.46 3.45 1.33 4.95L2 22l5.23-1.37a9.9 9.9 0 0 0 4.8 1.23h.01c5.5 0 9.96-4.46 9.96-9.96C22 6.46 17.55 2 12.04 2Zm0 18.19h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.11.82.83-3.03-.2-.31a8.24 8.24 0 0 1-1.26-4.38c0-4.55 3.7-8.25 8.25-8.25 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.42 5.84c0 4.55-3.71 8.22-8.26 8.22Zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.99-1.22-.73-.65-1.23-1.46-1.37-1.71-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43-.14-.01-.31-.01-.48-.01-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.08 0 1.23.89 2.42 1.02 2.58.12.17 1.75 2.67 4.24 3.75.59.26 1.05.41 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.68-1.19.21-.58.21-1.08.15-1.19-.06-.11-.23-.17-.48-.29Z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.6 2h-3.2v13.6a2.8 2.8 0 1 1-2-2.68V9.7a5.9 5.9 0 1 0 5.2 5.86V8.4a8.1 8.1 0 0 0 4.6 1.44V6.6a4.9 4.9 0 0 1-4.6-4.6Z" />
    </svg>
  );
}

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Compre",
    links: [
      { href: "/loja", label: "Catálogo" },
      { href: "/loja?filtro=novidades", label: "Novidades" },
      { href: "/personalizado", label: "Sob encomenda" },
    ],
  },
  {
    title: "Atendimento",
    links: [
      { href: "/contato", label: "Contato" },
      { href: "/faq", label: "FAQ" },
      { href: "/rastreamento", label: "Rastrear pedido" },
      { href: "/trocas-e-devolucoes", label: "Trocas e devoluções" },
    ],
  },
  {
    title: "Institucional",
    links: [
      { href: "/sobre", label: "Sobre a Fazaê" },
      { href: "/privacidade", label: "Privacidade" },
      { href: "/termos", label: "Termos" },
    ],
  },
];

/** TODO(fase DB): trocar pelo Settings real (getSettings()) assim que a Fazaê tiver o próprio banco — ver nota em src/server/repositories/settings-repository.ts. */
export async function Footer() {
  const whatsappNumber = DEFAULT_WHATSAPP_NUMBER;

  return (
    <footer className="relative overflow-hidden bg-ink text-paper">
      <FlowLines className="flow-lines-bg absolute inset-x-0 bottom-0 h-2/3 w-full" variant="light" />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 border-b border-paper/15 pb-12 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <img src="/logo-header.png" alt={SITE_NAME} className="h-8 w-auto" />
            <p className="label-caps mt-3 text-xs text-paper/60">{SITE_TAGLINE}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/loja"
              className="label-caps inline-flex w-fit items-center gap-2 rounded-full border border-paper/40 px-6 py-3 text-xs text-paper transition-colors hover:border-petrol hover:text-petrol"
            >
              Ver produtos
            </Link>
            <a
              href={getWhatsAppLink(whatsappNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="label-caps inline-flex w-fit items-center gap-2 rounded-full bg-petrol px-6 py-3 text-xs text-ink transition-colors hover:bg-paper"
            >
              Fazer orçamento no WhatsApp
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-10 py-12 sm:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="label-caps mb-4 text-xs text-paper/60">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-paper/85 transition-colors hover:text-petrol">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <p className="label-caps mb-4 text-xs text-paper/60">Redes</p>
            <ul className="space-y-2.5">
              <li>
                <a
                  href={getWhatsAppLink(whatsappNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-paper/85 transition-colors hover:text-petrol"
                >
                  <WhatsAppIcon className="h-4 w-4 shrink-0" />
                  WhatsApp
                </a>
              </li>
              <li>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-paper/85 transition-colors hover:text-petrol"
                >
                  <InstagramIcon className="h-4 w-4 shrink-0" />
                  Instagram
                </a>
              </li>
              <li>
                <span className="flex items-center gap-2 text-sm text-paper/85">
                  <TikTokIcon className="h-4 w-4 shrink-0" />
                  TikTok
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-paper/15 pt-8 text-xs text-paper/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {SITE_NAME}. Todos os direitos reservados.</p>
          <div className="flex flex-wrap items-center gap-5">
            <SecurityBadge />
            <PaymentIcons />
          </div>
        </div>
      </div>
    </footer>
  );
}
