import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { TrackingForm } from "@/components/tracking-form";

export const metadata: Metadata = {
  title: "Rastreamento",
};

export default async function RastreamentoPage({ searchParams }: PageProps<"/rastreamento">) {
  const params = await searchParams;
  const pedido = typeof params.pedido === "string" ? params.pedido : "";

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Rastreamento" }]} />
      <h1 className="font-display mb-3 text-3xl sm:text-4xl">Rastreie seu pedido</h1>
      <p className="mb-10 text-graphite">Informe o número do pedido para acompanhar o status da entrega.</p>
      <TrackingForm initialOrderId={pedido} />
    </div>
  );
}
