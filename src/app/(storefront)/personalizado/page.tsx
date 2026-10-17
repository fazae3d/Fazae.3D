import { pageMeta } from "@/lib/seo";
import type { Metadata } from "next";
import { SectionHeading } from "@/components/section-heading";
import { CustomOrderForm } from "@/components/custom-order-form";
import { getProduct } from "@/lib/demo-data";
import { withReadFallback } from "@/lib/db-fallback";

export const metadata: Metadata = pageMeta({
  title: "Peça personalizada sob encomenda: orçamento de impressão 3D",
  description: "Quer uma peça única? Conte sua ideia e receba orçamento de impressão 3D personalizada: chaveiros, miniaturas e presentes. Natal, Parnamirim e todo o Brasil.",
  path: "/personalizado",
});

const STEPS = [
  "Você tem uma ideia",
  "Fale com a gente",
  "Desenvolvemos seu projeto",
  "Imprimimos com qualidade",
  "Enviamos para você",
];

export default async function PersonalizadoPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  // Vindo da página de um produto ("personalizar este"): já preenche a descrição com o nome dele.
  const refProduct = ref ? await withReadFallback(() => getProduct(ref), undefined) : undefined;
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        as="h1"
        eyebrow="Sob encomenda"
        title="Sua ideia, impressa do seu jeito"
        subtitle="Não achou o que precisa no catálogo? Conta pra gente o que você imagina, com material, cor, tamanho e referências, e a gente monta a peça perfeita para você."
      />

      <ol className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
        {STEPS.map((step, i) => (
          <li key={step} className="label-caps flex items-center gap-2 text-[11px] text-graphite">
            <span className="flex h-5 w-5 items-center justify-center rounded-full border border-petrol/40 text-[10px] text-petrol">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      <div className="mt-12 max-w-2xl">
        <CustomOrderForm
          referenceProductSlug={refProduct?.slug}
          defaultDescription={refProduct ? `Quero uma versão personalizada de: ${refProduct.name}. ` : undefined}
        />
      </div>
    </div>
  );
}
