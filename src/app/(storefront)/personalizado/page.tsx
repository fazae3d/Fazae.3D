import type { Metadata } from "next";
import { SectionHeading } from "@/components/section-heading";
import { CustomOrderForm } from "@/components/custom-order-form";

export const metadata: Metadata = {
  title: "Peça sob encomenda",
};

const STEPS = [
  "Você tem uma ideia",
  "Fale com a gente",
  "Desenvolvemos seu projeto",
  "Imprimimos com qualidade",
  "Enviamos para você",
];

export default function PersonalizadoPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
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
        <CustomOrderForm />
      </div>
    </div>
  );
}
