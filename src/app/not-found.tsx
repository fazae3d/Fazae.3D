import { ButtonLink } from "@/components/button";
import { FlowLines } from "@/components/flow-lines";

export default function NotFound() {
  return (
    <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden bg-paper">
      <FlowLines className="flow-lines-bg absolute inset-0 h-full w-full" variant="dark" />
      <div className="relative px-4 text-center">
        <p className="label-caps text-xs text-petrol">Erro 404</p>
        <h1 className="font-display mt-4 text-4xl sm:text-5xl">VOCÊ SAIU DO FLUXO.</h1>
        <p className="mt-4 text-graphite">Essa página não existe.</p>
        <ButtonLink href="/" variant="primary" className="mt-8 inline-flex">
          Voltar para a loja
        </ButtonLink>
      </div>
    </div>
  );
}
