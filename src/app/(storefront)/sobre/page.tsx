import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { ButtonLink } from "@/components/button";
import { SectionHeading } from "@/components/section-heading";

export const metadata: Metadata = {
  title: "Sobre a Fazaê",
  description: "Conheça a Fazaê: impressão 3D própria, peças prontas e sob encomenda em Natal/RN.",
};

function BoltIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5.2" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
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

function PuzzleIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4h4a1 1 0 0 1 1 1v1.2a1.8 1.8 0 1 0 0 3.6V11a1 1 0 0 1-1 1h-2.2a1.8 1.8 0 1 1-3.6 0H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h1.2a1.8 1.8 0 1 0 3.6 0V5a1 1 0 0 1 1-1Z" />
    </svg>
  );
}

const VALUES = [
  {
    title: "Inovação",
    tagline: "Tecnologia para transformar possibilidades em realidade.",
    description: "Exploramos a impressão 3D para criar produtos diferentes, funcionais e cada vez melhores.",
    icon: <BoltIcon />,
  },
  {
    title: "Qualidade",
    tagline: "Do primeiro detalhe ao produto final.",
    description: "Cuidamos de cada etapa para entregar peças com bom acabamento, precisão e consistência.",
    icon: <TargetIcon />,
  },
  {
    title: "Criatividade",
    tagline: "Pensar diferente faz parte do nosso processo.",
    description: "Buscamos novas formas, soluções e possibilidades para transformar ideias em produtos que surpreendem.",
    icon: <BulbIcon />,
  },
  {
    title: "Feito para você",
    tagline: "Nem tudo precisa sair de uma prateleira.",
    description: "Criamos sob demanda e também desenvolvemos peças personalizadas para quem procura algo único.",
    icon: <PuzzleIcon />,
  },
];

export default function SobrePage() {
  return (
    <div>
      <section className="relative flex h-72 items-end overflow-hidden bg-ink text-paper sm:h-96">
        <img
          src="/sobre-hero.png"
          alt="Impressora 3D da Fazaê imprimindo um vaso geométrico verde"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 to-transparent" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <p className="label-caps text-xs text-petrol">Institucional</p>
          <h1 className="font-display mt-2 text-4xl sm:text-5xl">Sobre a Fazaê</h1>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Sobre a Fazaê" }]} />
        <SectionHeading
          eyebrow="Quem somos"
          title="Criamos com propósito, impressão 3D do jeito que você imagina"
          className="mb-6"
        />
        <div className="space-y-4 text-graphite">
          <p>Não é só sobre transformar plástico em objetos.</p>
          <p>
            É sobre criar produtos que tenham uma razão para existir, seja para resolver um problema, transformar
            um ambiente, presentear alguém ou simplesmente trazer algo diferente para o seu dia.
          </p>
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
                <p className="mt-3 text-sm font-bold text-paper">{value.tagline}</p>
                <p className="mt-1.5 text-sm text-graphite">{value.description}</p>
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
