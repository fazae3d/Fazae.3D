import { Hero } from "@/components/hero";
import { SectionHeading } from "@/components/section-heading";
import { CatalogTeaserCard } from "@/components/catalog-teaser-card";
import { FlowLines } from "@/components/flow-lines";
import { ButtonLink } from "@/components/button";
import { CATALOG_TEASER } from "@/lib/catalog-teaser-data";
import { getCategory } from "@/lib/categories";

const STEPS = [
  {
    n: "1",
    title: "Você tem uma ideia",
    description: "Tudo começa com sua inspiração.",
    image: "/how-it-works/step-1.png",
  },
  {
    n: "2",
    title: "Fale com a gente",
    description: "Conte sua ideia, envie referências ou um esboço.",
    image: "/how-it-works/step-2.png",
  },
  {
    n: "3",
    title: "Desenvolvemos seu projeto",
    description: "Nossa equipe transforma sua ideia em um projeto 3D exclusivo.",
    image: "/how-it-works/step-3.png",
  },
  {
    n: "4",
    title: "Imprimimos com qualidade",
    description: "Produção com precisão, acabamento impecável.",
    image: "/how-it-works/step-4.png",
  },
  {
    n: "5",
    title: "Enviamos para você",
    description: "Embalamos com cuidado e enviamos para todo o Brasil.",
    image: "/how-it-works/step-5.png",
  },
];

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3 4.5 6v6c0 4.2 3.2 7.7 7.5 9 4.3-1.3 7.5-4.8 7.5-9V6Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

const TRUST_BADGES = [
  { label: "Projeto personalizado", icon: "/trust-badges/icon-personalizado.png" },
  { label: "Feito sob medida", icon: "/trust-badges/icon-medida.png" },
  { label: "Produção em 3D", icon: "/trust-badges/icon-producao.png" },
  { label: "Envio para todo o Brasil", icon: "/trust-badges/icon-envio.png" },
];

const ESSENCE_TAGLINE = "Criatividade, Tecnologia & Design.";

export default function Home() {
  return (
    <>
      <Hero />

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Catálogo"
            title="Do seu jeito. Em 3D."
            subtitle="Cultura geek, decoração, presentes personalizados e utilidades criativas. Cada peça com acabamento premium."
          />
          <ButtonLink href="/loja" variant="secondary">
            Ver produtos
          </ButtonLink>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {CATALOG_TEASER.slice(0, 4).map((item) => (
            <CatalogTeaserCard
              key={item.slug}
              href={`/loja?categoria=${item.categorySlug}`}
              slug={item.slug}
              category={getCategory(item.categorySlug)?.label ?? item.categorySlug}
              title={item.title}
              tone={item.tone}
            />
          ))}
        </div>
      </section>

      <section id="como-funciona" className="py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            align="center"
            eyebrow="Da ideia à matéria"
            title="Como funciona"
            className="mx-auto mb-14"
          />
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:flex sm:w-full sm:flex-row sm:items-start sm:justify-center sm:gap-x-6 lg:gap-x-10">
            {STEPS.map((step, i) => (
              <div
                key={step.n}
                className={`flex items-start justify-center gap-3 ${i === STEPS.length - 1 ? "col-span-2" : ""}`}
              >
                <div className="w-32 text-center sm:w-52">
                  <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-petrol/50 font-display text-sm font-bold text-petrol sm:h-10 sm:w-10 sm:text-base">
                    {step.n}
                  </div>
                  <div className="mx-auto mt-3 flex h-20 w-24 items-center justify-center sm:mt-5 sm:h-44 sm:w-48">
                    <img src={step.image} alt="" className="max-h-full max-w-full object-contain" />
                  </div>
                  <p className="mt-3 text-sm font-bold text-paper sm:mt-5 sm:text-base">{step.title}</p>
                  <p className="mt-1 text-xs text-paper/60 sm:mt-1.5 sm:text-sm">{step.description}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="hidden shrink-0 text-petrol/60 sm:mt-[136px] sm:block"
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                )}
              </div>
            ))}
          </div>

          <div className="mt-10 grid grid-cols-1 items-center gap-6 border-t border-paper/10 pt-10 sm:mt-14 sm:gap-8 sm:pt-12 lg:mt-20 lg:grid-cols-2 lg:gap-16 lg:pt-16">
            <div>
              <p className="label-caps flex items-center gap-2 text-xs text-petrol">
                <span aria-hidden>▸</span> Não encontrou o que procurava?
              </p>
              <h3 className="font-display mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">
                ENTÃO VAMOS <span className="text-petrol">CRIAR.</span>
              </h3>
              <p className="mt-5 max-w-md text-lg font-bold text-paper">Tem algo específico em mente?</p>
              <p className="mt-3 max-w-md text-paper/80">
                Pode ser uma foto, um desenho, uma referência, algumas medidas ou simplesmente uma
                ideia. Você conta o que precisa e nossa equipe transforma isso em um projeto.
              </p>
              <p className="mt-3 max-w-md text-paper/80">
                Do primeiro rascunho à peça pronta, criamos algo pensado para você.
              </p>
              <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3">
                {TRUST_BADGES.map((badge) => (
                  <li key={badge.label} className="flex items-center gap-2 text-xs text-paper/75">
                    <img src={badge.icon} alt="" className="h-5 w-5 shrink-0 object-contain" />
                    {badge.label}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/personalizado" variant="primary" className="mt-8 w-full whitespace-nowrap sm:w-auto">
                Quero criar minha peça
              </ButtonLink>
              <p className="mt-4 flex items-center gap-2 text-[11px] text-paper/50">
                <ShieldCheckIcon className="h-3.5 w-3.5 shrink-0" />
                Seus dados e ideias estão 100% seguros com a gente.
              </p>
            </div>
            <img
              src="/ideia-projeto-peca.png"
              alt="Da ideia ao projeto 3D até a peça impressa"
              className="mx-auto w-full max-w-lg lg:max-w-none"
            />
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-ink py-12 text-paper sm:py-16 lg:py-20">
        <FlowLines className="flow-lines-bg absolute inset-0 h-full w-full" variant="light" />
        <img
          src="/essence-fmark.png"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-10 lg:hidden"
        />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-stretch gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
          <div>
            <p className="label-caps text-xs text-petrol">Nossa essência</p>
            <h2 className="font-display mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">
              NÃO É SÓ SOBRE IMPRIMIR.
              <br />
              <span className="text-petrol">É SOBRE CRIAR.</span>
            </h2>
            <div className="mt-6 max-w-lg space-y-3 text-lg text-paper/85">
              <p>
                A tecnologia é o nosso ponto de partida, a criatividade é o que nos leva além.
              </p>
              <p>
                Na <strong className="text-paper">Fazaê</strong>, transformamos tecnologia, design
                e criatividade em objetos que fazem sentido para quem compra, seja para decorar,
                organizar, presentear ou simplesmente ter algo diferente.
              </p>
              <p>
                Porque quando tecnologia encontra criatividade, até uma ideia simples pode virar
                algo extraordinário.
              </p>
            </div>
            <p className="label-caps mt-8 text-sm text-petrol">{ESSENCE_TAGLINE}</p>
          </div>
          <img
            src="/essence-fmark.png"
            alt="Marca Fazaê impressa em 3D ao lado de uma impressora em funcionamento"
            className="hidden h-full min-h-[280px] w-full object-cover lg:block"
            style={{
              maskImage:
                "radial-gradient(ellipse 75% 75% at 50% 50%, black 55%, transparent 100%)",
              WebkitMaskImage:
                "radial-gradient(ellipse 75% 75% at 50% 50%, black 55%, transparent 100%)",
            }}
          />
        </div>
      </section>
    </>
  );
}
