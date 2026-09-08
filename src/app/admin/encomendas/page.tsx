import { getAllCustomOrderRequests } from "@/server/repositories/custom-order-request-repository";
import { EncomendasBoard } from "@/components/admin/encomendas-board";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackCustomOrderRequests } from "@/server/demo-fallback";

export default async function AdminCustomOrderRequestsPage() {
  const requests = await withReadFallback(() => getAllCustomOrderRequests(), fallbackCustomOrderRequests);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">Encomendas</h1>
          <p className="mt-1 text-sm text-graphite">{requests.length} solicitação(ões) de orçamento personalizado</p>
        </div>
      </div>

      <EncomendasBoard requests={requests} />
    </div>
  );
}
