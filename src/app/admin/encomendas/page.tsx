import Link from "next/link";
import { getAllCustomOrderRequests } from "@/server/repositories/custom-order-request-repository";
import { EncomendasBoard } from "@/components/admin/encomendas-board";
import { PageHeader } from "@/components/admin/page-header";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackCustomOrderRequests } from "@/server/demo-fallback";

export const metadata = { title: "Encomendas" };

export default async function AdminCustomOrderRequestsPage() {
  const requests = await withReadFallback(() => getAllCustomOrderRequests(), fallbackCustomOrderRequests);

  return (
    <div>
      <PageHeader
        title="Encomendas"
        description={`${requests.length} pedido(s) de peça personalizada vindos do site. Use "Montar orçamento" para responder com uma proposta em PDF.`}
        actions={
          <Link href="/admin/orcamentos/novo" className="rounded-lg border border-mist px-3.5 py-2 text-sm transition-colors hover:border-petrol">
            Orçamento sem encomenda
          </Link>
        }
      />

      <EncomendasBoard requests={requests} />
    </div>
  );
}
