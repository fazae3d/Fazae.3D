import { PageHeader } from "@/components/admin/page-header";
import { StoreRulesForm } from "@/components/admin/store-rules-form";
import { getStoreRules } from "@/server/store-rules";

export const dynamic = "force-dynamic";
export const metadata = { title: "Regras da loja" };

export default async function StoreRulesPage() {
  const rules = await getStoreRules({ fresh: true });

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Regras da loja"
        description="Números, prazos e textos que a loja usa por trás dos panos. Tudo o que você mudar vale na hora e fica registrado em Atividade, com quem mudou e de quanto para quanto (dá para desfazer)."
      />
      <StoreRulesForm initial={rules} />
    </div>
  );
}
