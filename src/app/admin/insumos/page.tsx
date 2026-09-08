import Link from "next/link";
import { getAllRawMaterials } from "@/server/repositories/raw-material-repository";
import { DeleteRawMaterialButton } from "@/components/admin/delete-raw-material-button";
import { Badge } from "@/components/badge";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackRawMaterials } from "@/server/demo-fallback";
import { formatPrice } from "@/lib/format";

export default async function AdminRawMaterialsPage() {
  const rawMaterials = await withReadFallback(() => getAllRawMaterials(), fallbackRawMaterials);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl sm:text-3xl">Insumos</h1>
        <Link
          href="/admin/insumos/novo"
          className="label-caps border border-ink px-5 py-3 text-xs transition-colors hover:bg-ink hover:text-paper"
        >
          Novo insumo
        </Link>
      </div>

      <div className="overflow-x-auto border border-mist">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-mist bg-mist/30">
              <th className="label-caps px-4 py-3 text-[11px] text-graphite">Insumo</th>
              <th className="label-caps px-4 py-3 text-[11px] text-graphite">Unidade</th>
              <th className="label-caps px-4 py-3 text-[11px] text-graphite">Estoque</th>
              <th className="label-caps px-4 py-3 text-[11px] text-graphite">Custo/unidade</th>
              <th className="label-caps px-4 py-3 text-[11px] text-graphite">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {rawMaterials.map((rawMaterial) => {
              const lowStock = rawMaterial.stock <= (rawMaterial.minStock ?? 0);
              return (
                <tr key={rawMaterial.id} className={lowStock ? "bg-sand/10" : undefined}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/insumos/${rawMaterial.id}`} className="hover:text-petrol">
                      {rawMaterial.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-graphite">{rawMaterial.unit}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      {rawMaterial.stock}
                      {lowStock && <Badge tone="sand">Estoque baixo</Badge>}
                    </span>
                  </td>
                  <td className="px-4 py-3">{formatPrice(rawMaterial.costPerUnit)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/insumos/${rawMaterial.id}`}
                        className="label-caps text-[11px] text-graphite hover:text-petrol"
                      >
                        Editar
                      </Link>
                      <DeleteRawMaterialButton id={rawMaterial.id} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
