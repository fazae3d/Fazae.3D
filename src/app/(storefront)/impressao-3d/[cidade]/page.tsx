import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { ButtonLink } from "@/components/button";
import { JsonLd } from "@/components/json-ld";
import { withReadFallback } from "@/lib/db-fallback";
import { formatPrice } from "@/lib/format";
import { getLocalDeliveryRules } from "@/lib/local-delivery";
import { COMPANY } from "@/lib/site-config";
import { getSettings } from "@/server/repositories/settings-repository";

type City = { slug: string; name: string; intro: string };

const CITIES: City[] = [
  {
    slug: "natal",
    name: "Natal",
    intro: "Atendemos Natal com entrega por motoboy: você compra online e recebe em casa, sem esperar o envio pelos Correios.",
  },
  {
    slug: "parnamirim",
    name: "Parnamirim",
    intro: "A Fazaê fica em Parnamirim: as peças são produzidas aqui e a entrega por motoboy na cidade é rápida.",
  },
];

export function generateStaticParams() {
  return CITIES.map((c) => ({ cidade: c.slug }));
}

type CityParams = { params: Promise<{ cidade: string }> };

export async function generateMetadata({ params }: CityParams): Promise<Metadata> {
  const { cidade } = await params;
  const city = CITIES.find((c) => c.slug === cidade);
  if (!city) return {};
  return pageMeta({
    title: `Impressão 3D em ${city.name}/RN: peças prontas e sob encomenda`,
    description: `Impressão 3D em ${city.name}/RN: chaveiros, decoração e peças personalizadas. Entrega por motoboy em até 48h, orçamento sob encomenda e Pix, cartão ou boleto.`,
    path: `/impressao-3d/${city.slug}`,
  });
}

export default async function LocalLandingPage({ params }: CityParams) {
  const { cidade } = await params;
  const city = CITIES.find((c) => c.slug === cidade);
  if (!city) notFound();

  const settings = await withReadFallback(() => getSettings(), { freeShippingThreshold: 299.9, whatsappNumber: "" });
  const rules = getLocalDeliveryRules(settings);
  const other = CITIES.find((c) => c.slug !== city.slug)!;

  const faq = [
    {
      q: `Vocês fazem entrega em ${city.name}?`,
      a: `Sim. Em Natal e Parnamirim a entrega é feita por motoboy, em até 48h. O frete é ${formatPrice(rules.fee)} e fica grátis em compras a partir de ${formatPrice(rules.threshold)}.`,
    },
    {
      q: "Dá para pedir uma peça personalizada?",
      a: "Dá. Você conta a ideia, o tamanho, a cor e a quantidade, e a gente envia um orçamento. A peça é produzida só depois que você aprova.",
    },
    {
      q: "Quais formas de pagamento vocês aceitam?",
      a: "Pix, cartão de crédito parcelado e boleto, processados pelo Mercado Pago.",
    },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: `Impressão 3D em ${city.name}` }]} />
      <h1 className="font-display mb-6 text-3xl sm:text-4xl">Impressão 3D em {city.name}/RN: peças prontas e sob encomenda</h1>

      <div className="space-y-8 text-graphite">
        <section>
          <p className="leading-relaxed">
            A Fazaê 3D produz chaveiros, itens de decoração, peças geek e utilidades impressas em 3D, com impressoras próprias. {city.intro}
          </p>
        </section>

        <section>
          <h2 className="font-display mb-3 text-xl text-paper">O que você encontra</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <Link href="/loja" className="text-petrol hover:underline">
                Peças prontas
              </Link>
              : chaveiros, decoração, itens geek e utilidades, com envio rápido.
            </li>
            <li>
              <Link href="/personalizado" className="text-petrol hover:underline">
                Peças sob encomenda
              </Link>
              : você escolhe o tema, o tamanho e a cor, e a gente cria do seu jeito.
            </li>
            <li>
              Presentes e lembrancinhas para aniversários, eventos e empresas (veja nossas{" "}
              <Link href="/guias/presentes-personalizados-em-3d" className="text-petrol hover:underline">
                ideias de presentes personalizados
              </Link>
              ).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display mb-3 text-xl text-paper">Entrega por motoboy em {city.name}</h2>
          <p className="leading-relaxed">
            Em Natal e Parnamirim a gente entrega por motoboy, em até 48h. O frete é de {formatPrice(rules.fee)} e fica{" "}
            <strong className="text-paper">grátis em compras a partir de {formatPrice(rules.threshold)}</strong>. Para o resto do Brasil,
            enviamos pelos Correios e transportadoras, com frete calculado no checkout.
          </p>
        </section>

        <section>
          <h2 className="font-display mb-3 text-xl text-paper">Materiais</h2>
          <p className="leading-relaxed">
            Trabalhamos com materiais como PLA e PETG. Não sabe qual escolher? Leia o guia{" "}
            <Link href="/guias/pla-ou-petg-qual-material-escolher" className="text-petrol hover:underline">
              PLA ou PETG: qual material escolher
            </Link>{" "}
            ou conte para a gente onde a peça vai ser usada.
          </p>
        </section>

        <section>
          <h2 className="font-display mb-3 text-xl text-paper">Perguntas frequentes</h2>
          <dl className="space-y-4">
            {faq.map((f) => (
              <div key={f.q}>
                <dt className="text-paper">{f.q}</dt>
                <dd className="mt-1">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="border border-paper/10 bg-mist p-6">
          <p className="mb-4 text-paper/85">
            Estamos em {COMPANY.address}. Conte sua ideia e receba um orçamento, ou comece pelo catálogo.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/personalizado" variant="primary">
              Fazer orçamento
            </ButtonLink>
            <ButtonLink href="/loja" variant="secondary">
              Ver produtos
            </ButtonLink>
          </div>
        </section>

        <p className="text-sm">
          Também atendemos{" "}
          <Link href={`/impressao-3d/${other.slug}`} className="text-petrol hover:underline">
            impressão 3D em {other.name}
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
