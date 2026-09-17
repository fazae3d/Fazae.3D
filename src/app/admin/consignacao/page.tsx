import Link from "next/link";
import { getAllConsigneesWithSummary } from "@/server/repositories/consignment-repository";
import { formatPrice } from "@/lib/format";
import { formatDocument } from "@/lib/cpf";
import { withReadFallback } from "@/lib/db-fallback";

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function isOverdue(iso?: string) {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

export default async function AdminConsignmentPage() {
  const consignees = await withReadFallback(() => getAllConsigneesWithSummary(), []);

  const totalValueOpen = consignees.reduce((sum, c) => sum + c.totalValueOpen, 0);
  const overdueCount = consignees.filter((c) => isOverdue(c.nextVisitDate)).length;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">Consignação</h1>
          <p className="mt-1 text-sm text-graphite">
            {consignees.length} lojista{consignees.length === 1 ? "" : "s"} cadastrado{consignees.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="/admin/consignacao/novo"
          className="label-caps border border-ink px-5 py-2.5 text-xs transition-colors hover:bg-ink hover:text-paper"
        >
          Novo lojista
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="border border-mist p-5">
          <p className="label-caps text-[11px] text-graphite">Valor total em aberto</p>
          <p className="font-display mt-1 text-2xl">{formatPrice(totalValueOpen)}</p>
        </div>
        <div className="border border-mist p-5">
          <p className="label-caps text-[11px] text-graphite">Visitas atrasadas</p>
          <p className={`font-display mt-1 text-2xl ${overdueCount > 0 ? "text-red-600" : ""}`}>{overdueCount}</p>
        </div>
      </div>

      {consignees.length === 0 ? (
        <div className="border border-mist px-6 py-16 text-center text-graphite">
          Nenhum lojista cadastrado ainda.
        </div>
      ) : (
        <div className="overflow-x-auto border border-mist">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-mist bg-mist/30">
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Nome</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Documento</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Telefone</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Cidade</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Peças em aberto</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Valor em aberto</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Próxima visita</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {consignees.map((c) => {
                const overdue = isOverdue(c.nextVisitDate);
                return (
                  <tr key={c.id} className={c.active ? undefined : "opacity-50"}>
                    <td className="px-4 py-3">
                      <Link href={`/admin/consignacao/${c.id}`} className="hover:text-petrol">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-graphite">{formatDocument(c.document)}</td>
                    <td className="px-4 py-3 text-graphite">{c.phone}</td>
                    <td className="px-4 py-3 text-graphite">{c.city ?? "—"}</td>
                    <td className="px-4 py-3">{c.totalItems}</td>
                    <td className="px-4 py-3">{formatPrice(c.totalValueOpen)}</td>
                    <td className={`px-4 py-3 ${overdue ? "font-medium text-red-600" : "text-graphite"}`}>
                      {formatDate(c.nextVisitDate)}
                      {overdue && " · atrasada"}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/consignacao/${c.id}`}
                        className="label-caps text-[11px] text-graphite hover:text-petrol"
                      >
                        Ver detalhes
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
