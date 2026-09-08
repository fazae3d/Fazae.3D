import type { Metadata } from "next";
import Link from "next/link";
import { Accordion } from "@/components/accordion";
import { Breadcrumb } from "@/components/breadcrumb";

export const metadata: Metadata = {
  title: "FAQ",
};

const FAQ_ITEMS = [
  {
    title: "Vocês fabricam as peças ou revendem?",
    plainAnswer:
      "A Fazaê imprime cada peça aqui, com impressoras 3D próprias. Não revendemos produtos de terceiros.",
    content:
      "A Fazaê imprime cada peça aqui, com impressoras 3D próprias. Não revendemos produtos de terceiros.",
  },
  {
    title: "Qual a diferença entre pronta entrega e sob encomenda?",
    plainAnswer:
      "Peças de pronta entrega já existem em estoque e enviamos assim que o pagamento é aprovado. Peças sob encomenda são impressas especialmente para você, com material, cor e prazo combinados pelo WhatsApp.",
    content: (
      <>
        Peças de <strong>pronta entrega</strong> já existem em estoque e enviamos assim que o pagamento é
        aprovado. Peças <strong>sob encomenda</strong> são impressas especialmente para você. Conte pra gente o
        que precisa em{" "}
        <Link href="/personalizado" className="text-petrol hover:underline">
          Fazer orçamento
        </Link>
        .
      </>
    ),
  },
  {
    title: "Quais formas de pagamento são aceitas?",
    plainAnswer: "PIX, cartão de crédito e boleto. Este ambiente ainda está em fase de testes, sem cobrança real.",
    content: "PIX, cartão de crédito e boleto. Este ambiente ainda está em fase de testes, sem cobrança real.",
  },
  {
    title: "Qual o prazo de entrega?",
    plainAnswer:
      "Peças prontas: enviamos em até 2 dias úteis após a confirmação do pagamento. Peças sob encomenda: o prazo de produção varia por peça e é combinado com você no orçamento.",
    content:
      "Peças prontas: enviamos em até 2 dias úteis após a confirmação do pagamento. Peças sob encomenda: o prazo de produção varia por peça e é combinado com você no orçamento.",
  },
  {
    title: "Como funcionam trocas e devoluções?",
    plainAnswer:
      "Peças prontas têm até 7 dias após o recebimento para troca ou devolução. Peças sob encomenda não têm direito de arrependimento, mas continuam cobertas por defeito de fabricação. Veja os detalhes na página de Trocas e devoluções.",
    content: (
      <>
        Peças prontas têm até 7 dias após o recebimento para troca ou devolução. Peças sob encomenda não têm
        direito de arrependimento, mas continuam cobertas por defeito de fabricação. Veja os detalhes em{" "}
        <Link href="/trocas-e-devolucoes" className="text-petrol hover:underline">
          Trocas e devoluções
        </Link>
        .
      </>
    ),
  },
  {
    title: "Preciso criar conta para comprar?",
    plainAnswer:
      "Não. Você pode finalizar a compra como convidado, informando apenas seu e-mail. Criar uma conta é opcional e permite acompanhar pedidos e salvar endereços com mais facilidade.",
    content:
      "Não. Você pode finalizar a compra como convidado, informando apenas seu e-mail. Criar uma conta é opcional e permite acompanhar pedidos e salvar endereços com mais facilidade.",
  },
  {
    title: "Como acompanho meu pedido?",
    plainAnswer: "Acesse Meus pedidos na sua conta ou use o número do pedido na página de Rastreamento.",
    content: (
      <>
        Acesse{" "}
        <Link href="/conta/pedidos" className="text-petrol hover:underline">
          Meus pedidos
        </Link>{" "}
        ou use o número do pedido em{" "}
        <Link href="/rastreamento" className="text-petrol hover:underline">
          Rastreamento
        </Link>
        .
      </>
    ),
  },
  {
    title: "Quero uma peça que não está no catálogo. Dá pra imprimir?",
    plainAnswer:
      "Sim! Descreva o que você quer na página de Fazer orçamento (material, cor, tamanho e referências) e a gente conversa pelo WhatsApp sobre prazo e valor.",
    content: (
      <>
        Sim! Descreva o que você quer na página de{" "}
        <Link href="/personalizado" className="text-petrol hover:underline">
          Fazer orçamento
        </Link>{" "}
        (material, cor, tamanho e referências) e a gente conversa pelo WhatsApp sobre prazo e valor.
      </>
    ),
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.title,
    acceptedAnswer: { "@type": "Answer", text: item.plainAnswer },
  })),
};

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "FAQ" }]} />
      <h1 className="font-display mb-10 text-3xl sm:text-4xl">Perguntas frequentes</h1>
      <Accordion items={FAQ_ITEMS} defaultOpenIndex={-1} />
    </div>
  );
}
