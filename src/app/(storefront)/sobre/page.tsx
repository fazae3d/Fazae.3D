import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { ButtonLink } from "@/components/button";
import { PlaceholderPhoto } from "@/components/placeholder-photo";
import { SectionHeading } from "@/components/section-heading";

export const metadata: Metadata = {
  title: "Sobre a Fazaê",
  description: "Conheça a Fazaê: impressão 3D própria, peças prontas e sob encomenda em Natal/RN.",
};

function PrinterIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8V3h12v5" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2" />
      <path d="M6 14h12v7H6z" />
    </svg>
  );
}

function RulerIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 15.5 15.5 3.5a1.4 1.4 0 0 1 2 0l3 3a1.4 1.4 0 0 1 0 2L8.5 20.5a1.4 1.4 0 0 1-2 0l-3-3a1.4 1.4 0 0 1 0-2Z" />
      <path d="m14 5 2 2M11 8l2 2M8 11l2 2M5 14l2 2" />
    </svg>
  );
}

function BulbIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.45 1 1.2 1 2.2h5.2c0-1 .4-1.75 1-2.2A6 6 0 0 0 12 3Z" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 20c8 0 14-6 14-14V5h-1C10 5 5 10 5 18v2Z" />
      <path d="M5 20c2-6 5-9 9-11" />
    </svg>
  );
}

const VALUES = [
  {
    title: "Tecnologia",
    description: "Impressoras e materiais atualizados para peças com acabamento consistente.",
    icon: <PrinterIcon />,
  },
  {
    title: "Precisão",
    description: "Cada peça é conferida antes de sair daqui: medida, acabamento e cor.",
    icon: <RulerIcon />,
  },
  {
    title: "Criatividade",
    description: "Do esboço mais simples a um arquivo 3D pronto, a gente ajuda a materializar.",
    icon: <BulbIcon />,
  },
  {
    title: "Produção sob demanda",
    description: "Imprimimos o que é pedido, sem estoque parado, gerando menos desperdício de material.",
    icon: <LeafIcon />,
  },
];

export default function SobrePage() {
  return (
    <div>
      <section className="relative flex h-72 items-end overflow-hidden bg-ink text-paper sm:h-96">
        <PlaceholderPhoto tone="ink" className="absolute inset-0 h-full w-full" demoTag={false} />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 to-transparent" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <p className="label-caps text-xs text-petrol">Institucional</p>
          <h1 className="font-display mt-2 text-4xl sm:text-5xl">Sobre a Fazaê</h1>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Sobre a Fazaê" }]} />
        <SectionHeading eyebrow="Quem somos" title="Impressão 3D, do jeito que você imagina" className="mb-6" />
        <div className="space-y-4 text-graphite">
          <p>
            A Fazaê nasceu da união entre criatividade, tecnologia e imaginação. Imprimimos cada peça aqui mesmo,
            com nossas próprias impressoras. Nada é revendido ou terceirizado.
          </p>
          <p>
            Trabalhamos com dois formatos: peças de catálogo prontas para envio imediato, e peças sob encomenda,
            feitas do seu jeito depois de combinar material, cor e prazo com você pelo WhatsApp.
          </p>
          <p>Não vendemos apenas produtos impressos. Nós materializamos criatividade.</p>
        </div>
      </section>

      <section className="bg-mist/40 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="O que nos guia" title="Nossos valores" align="center" className="mx-auto mb-12" />
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {VALUES.map((value) => (
              <div key={value.title} className="border border-paper/10 p-6">
                <div className="text-petrol">{value.icon}</div>
                <p className="font-display mt-3 text-lg">{value.title}</p>
                <span className="mt-2 block h-0.5 w-6 bg-petrol" />
                <p className="mt-3 text-sm text-graphite">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <p className="font-display text-2xl">Você imagina. A gente cria.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <ButtonLink href="/loja" variant="primary">
            Ver produtos
          </ButtonLink>
          <ButtonLink href="/personalizado" variant="secondary">
            Fazer orçamento
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
