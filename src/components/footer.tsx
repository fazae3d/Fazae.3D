import Link from "next/link";
import { FlowLines } from "./flow-lines";
import { PaymentIcons } from "./payment-icons";
import { SecurityBadge } from "./security-badge";
import { DEFAULT_WHATSAPP_NUMBER, INSTAGRAM_URL, SITE_NAME, SITE_TAGLINE, getWhatsAppLink } from "@/lib/site-config";

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
                  className="text-sm text-paper/85 transition-colors hover:text-petrol"
                >
                  WhatsApp
                </a>
              </li>
              <li>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-paper/85 transition-colors hover:text-petrol"
                >
                  Instagram
                </a>
              </li>
              <li>
                <span className="text-sm text-paper/85">TikTok</span>
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
