import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { COMPANY } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Política de privacidade",
};

const SECTION_TITLE = "mb-2 text-sm text-paper label-caps";

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Privacidade" }]} />
      <h1 className="font-display mb-8 text-3xl sm:text-4xl">Política de privacidade</h1>

      <div className="space-y-6 text-graphite">
        <section>
          <h2 className={SECTION_TITLE}>Quem cuida dos seus dados</h2>
          <p>
            O controlador dos dados é {COMPANY.legalName}
            {COMPANY.cnpj ? `, CNPJ ${COMPANY.cnpj}` : ""}, {COMPANY.address}, CEP {COMPANY.zip}. Para qualquer assunto sobre seus
            dados, fale com a gente pela página de{" "}
            <a href="/contato" className="text-petrol hover:underline">
              Contato
            </a>
            .
          </p>
        </section>
        <section>
          <h2 className={SECTION_TITLE}>Dados que coletamos</h2>
          <p>
            Nome, e-mail, telefone, CPF, endereço de entrega e histórico de pedidos, informados por você no cadastro, no checkout ou no
            formulário de peça sob encomenda. Também registramos dados técnicos de acesso (como endereço IP) para segurança e para evitar
            abuso do site, e, se você aceitar os cookies de medição, dados de navegação anônimos do Google Analytics.
          </p>
        </section>
        <section>
          <h2 className={SECTION_TITLE}>Para que usamos</h2>
          <p>
            Para processar e entregar pedidos (execução do contrato), emitir cobranças e prevenir fraude, montar orçamentos de peças sob
            encomenda, falar com você sobre o andamento do pedido pelo e-mail ou WhatsApp, cumprir obrigações legais e fiscais e, com o seu
            consentimento ou interesse legítimo, lembrar de carrinhos não finalizados e entender como o site é usado. Você pode parar de
            receber os lembretes de carrinho a qualquer momento pelo link no próprio e-mail.
          </p>
        </section>
        <section>
          <h2 className={SECTION_TITLE}>Com quem compartilhamos</h2>
          <p>Não vendemos seus dados. Eles são compartilhados apenas com quem precisa para a compra acontecer:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Mercado Pago, para processar o pagamento (Pix, cartão ou boleto).</li>
            <li>Transportadoras e Melhor Envio, para calcular o frete e entregar (nome, endereço e telefone).</li>
            <li>Resend, para enviar os e-mails da loja.</li>
            <li>Supabase e Vercel, onde o banco de dados e o site são hospedados.</li>
            <li>Google, para o Analytics, apenas se você aceitar os cookies de medição.</li>
          </ul>
        </section>
        <section>
          <h2 className={SECTION_TITLE}>Cookies</h2>
          <p>
            Usamos cookies essenciais para o funcionamento do site (login e carrinho). Os cookies de medição do Google Analytics só são
            ativados se você clicar em &ldquo;Aceitar&rdquo; no aviso do site; você pode recusar sem perder nenhuma funcionalidade, e
            mudar de ideia limpando os dados de navegação do seu navegador.
          </p>
        </section>
        <section>
          <h2 className={SECTION_TITLE}>Por quanto tempo guardamos</h2>
          <p>
            Guardamos os dados enquanto sua conta existir e pelo tempo necessário para cumprir obrigações legais, fiscais e de defesa em
            caso de reclamação (em geral, até 5 anos após a compra). Dados de lembrete de carrinho são apagados quando você pede para
            sair da lista ou conclui a compra.
          </p>
        </section>
        <section>
          <h2 className={SECTION_TITLE}>Seus direitos</h2>
          <p>
            Conforme a LGPD (Lei nº 13.709/2018), você pode pedir a confirmação de que tratamos seus dados, acesso, correção, anonimização,
            portabilidade, informação sobre compartilhamento, exclusão dos dados tratados com consentimento e a revogação do
            consentimento. Faça o pedido pela página de{" "}
            <a href="/contato" className="text-petrol hover:underline">
              Contato
            </a>{" "}
            e respondemos em até 15 dias. Se achar que algo não foi respeitado, você também pode reclamar à Autoridade Nacional de
            Proteção de Dados (ANPD).
          </p>
        </section>
      </div>
    </div>
  );
}
