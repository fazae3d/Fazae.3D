import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";

export const metadata: Metadata = {
  title: "Termos de uso",
};

export default function TermosPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Termos" }]} />
      <h1 className="font-display mb-8 text-3xl sm:text-4xl">Termos de uso</h1>

      <div className="space-y-6 text-graphite">
        <section>
          <h2 className="mb-2 text-sm text-paper label-caps">Sobre a loja</h2>
          <p>
            A Fazaê é uma loja própria de impressão 3D: nós produzimos cada peça vendida aqui, com impressoras e
            materiais próprios, seja pronta entrega ou sob encomenda.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-sm text-paper label-caps">Conta e cadastro</h2>
          <p>
            Você é responsável por manter a confidencialidade da sua senha e pelas atividades realizadas na sua
            conta.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-sm text-paper label-caps">Peças sob encomenda</h2>
          <p>
            Peças personalizadas são orçadas e confirmadas com você antes da produção, pelo WhatsApp. Prazo,
            material e valor combinados no orçamento passam a valer como parte do pedido.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-sm text-paper label-caps">Pedidos e pagamento</h2>
          <p>
            Este ambiente está em fase de testes: nenhuma cobrança real é processada durante essa fase.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-sm text-paper label-caps">Propriedade intelectual</h2>
          <p>A marca Fazaê, seu logotipo e identidade visual pertencem à Fazaê.</p>
        </section>
      </div>
    </div>
  );
}
