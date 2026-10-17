import { ButtonLink } from "@/components/button";
import { FlowLines } from "@/components/flow-lines";

export const metadata = { title: "Página não encontrada" };

export default function NotFound() {
  return (
    <div className="relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-ink">
      <FlowLines className="flow-lines-bg absolute inset-0 h-full w-full" variant="dark" />
      <div className="relative px-4 text-center">
        <p className="label-caps text-xs text-petrol">Erro 404</p>
        <h1 className="font-display mt-4 text-4xl text-paper sm:text-5xl">Essa página saiu do fluxo.</h1>
        <p className="mx-auto mt-4 max-w-md text-graphite">O endereço pode ter mudado ou nunca existiu. Que tal continuar por aqui?</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/loja" variant="primary" className="inline-flex">
            Ver a loja
          </ButtonLink>
          <ButtonLink href="/personalizado" variant="secondary" className="inline-flex">
            Pedir peça personalizada
          </ButtonLink>
        </div>
        <form action="/busca" className="mx-auto mt-8 flex max-w-sm gap-2">
          <input
            name="q"
            placeholder="Buscar produtos…"
            aria-label="Buscar produtos"
            className="min-w-0 flex-1 border-b border-paper/20 bg-transparent px-1 py-2 text-paper outline-none placeholder:text-paper/40 focus:border-petrol"
          />
          <button type="submit" className="label-caps px-3 text-xs text-petrol hover:underline">
            Buscar
          </button>
        </form>
      </div>
    </div>
  );
}
