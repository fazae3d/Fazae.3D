import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";

export const metadata: Metadata = {
  title: "Política de privacidade",
};

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Privacidade" }]} />
      <h1 className="font-display mb-8 text-3xl sm:text-4xl">Política de privacidade</h1>

      <div className="space-y-6 text-graphite">
        <section>
          <h2 className="mb-2 text-sm text-paper label-caps">Dados que coletamos</h2>
          <p>
            Nome, e-mail, telefone, endereço de entrega e histórico de pedidos, informados por você no cadastro,
            no checkout ou no formulário de peça sob encomenda.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-sm text-paper label-caps">Como usamos seus dados</h2>
          <p>
            Para processar pedidos, montar orçamentos de peças sob encomenda e falar com você pelo WhatsApp sobre
            o andamento do seu pedido.
          </p>
        </section>
        <section>
          <h2 className="mb-2 text-sm text-paper label-caps">Compartilhamento</h2>
          <p>Não vendemos seus dados a terceiros. Dados de entrega são compartilhados apenas com transportadoras.</p>
        </section>
        <section>
          <h2 className="mb-2 text-sm text-paper label-caps">Seus direitos</h2>
          <p>
            Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento pela página de{" "}
            <a href="/contato" className="text-petrol hover:underline">
              Contato
            </a>
            , conforme a LGPD (Lei nº 13.709/2018).
          </p>
        </section>
      </div>
    </div>
  );
}
