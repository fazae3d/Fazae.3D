import { ButtonLink } from "./button";

const FEATURES = [
  "Tecnologia em 3D",
  "Precisão em cada detalhe",
  "Impressão de qualidade",
  "Ideias que ganham forma",
];

export function Hero() {
  return (
    <section className="relative flex min-h-[440px] items-end overflow-hidden bg-ink text-paper sm:min-h-[520px] lg:min-h-[600px]">
      <img
        src="/hero-collection.png"
        alt="Coleção de peças impressas em 3D da Fazaê, em preto e verde-limão"
        fetchPriority="high"
        loading="eager"
        className="absolute inset-0 h-full w-full object-cover object-right"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/20 to-transparent sm:via-transparent" />

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-10 pt-24 sm:px-6 sm:pb-14 sm:pt-28 lg:px-8">
        <p className="label-caps animate-fade-up text-xs text-petrol opacity-0">
          Impressão 3D &amp; Criatividade
        </p>
        <h1 className="font-display animate-fade-up mt-3 max-w-2xl text-4xl font-extrabold leading-[1.05] tracking-tight opacity-0 sm:text-6xl [animation-delay:0.1s]">
          COISAS QUE VOCÊ
          <br />
          <span className="text-petrol">VAI QUERER TER.</span>
        </h1>
        <p className="animate-fade-up mt-4 max-w-lg text-base text-paper/80 opacity-0 [animation-delay:0.2s]">
          Peças funcionais, decorativas e criativas produzidas em 3D, com design, personalidade e
          acabamento premium. Descubra produtos feitos para transformar espaços, facilitar sua
          rotina e dar um toque diferente ao seu dia.
        </p>
        <div className="animate-fade-up mt-6 flex flex-wrap gap-4 opacity-0 [animation-delay:0.3s]">
          <ButtonLink href="/loja" variant="primary" className="w-56">
            Ver produtos
          </ButtonLink>
          <ButtonLink href="/personalizado" variant="secondary" className="w-56">
            Personalizar
          </ButtonLink>
        </div>
        <ul className="animate-fade-up mt-8 flex flex-wrap gap-x-8 gap-y-3 opacity-0 [animation-delay:0.4s]">
          {FEATURES.map((feature) => (
            <li key={feature} className="label-caps text-[10px] text-paper/60">
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
