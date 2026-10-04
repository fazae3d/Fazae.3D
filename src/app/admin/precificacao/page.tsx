/**
 * O precificador é uma ferramenta de arquivo único (HTML + JS próprio, lê STL/3MF/gcode
 * no navegador). Fica isolado num iframe servido por ./app/route.ts, só para o admin;
 * os valores padrão dele ficam salvos no navegador, não no banco.
 */
export default function AdminPricingPage() {
  return (
    <iframe
      src="/admin/precificacao/app"
      title="Precificador 3D"
      className="block h-[calc(100vh-7.5rem)] min-h-[560px] w-full border-0"
    />
  );
}
