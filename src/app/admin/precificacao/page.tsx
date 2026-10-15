import { PageHeader } from "@/components/admin/page-header";
import { PrecificadorFrame } from "@/components/admin/precificador-frame";

export const metadata = { title: "Precificação" };

/**
 * Os valores padrão da ferramenta (taxas, custo da máquina, margem) ficam salvos no navegador, não no banco.
 */
export default function AdminPricingPage() {
  return (
    <div>
      <PageHeader
        title="Precificação"
        description="Quanto cobrar por cada peça: custo real, preço sugerido e lucro por canal de venda, a partir do arquivo da peça."
      />
      <PrecificadorFrame />
    </div>
  );
}
