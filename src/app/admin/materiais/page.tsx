import Link from "next/link";
import { getAllMaterials } from "@/server/repositories/material-repository";
import { DeleteMaterialButton } from "@/components/admin/delete-material-button";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackMaterials } from "@/server/demo-fallback";

export default async function AdminMaterialsPage() {
  const materials = await withReadFallback(() => getAllMaterials(), fallbackMaterials);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl sm:text-3xl">Materiais</h1>
        <Link
          href="/admin/materiais/novo"
          className="label-caps border border-ink px-5 py-3 text-xs transition-colors hover:bg-ink hover:text-paper"
        >
          Novo material
        </Link>
      </div>

      <div className="overflow-x-auto border border-mist">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-mist bg-mist/30">
              <th className="label-caps px-4 py-3 text-[11px] text-graphite">Material</th>
              <th className="label-caps px-4 py-3 text-[11px] text-graphite">Cores</th>
              <th className="label-caps px-4 py-3 text-[11px] text-graphite">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {materials.map((material) => (
              <tr key={material.slug}>
                <td className="px-4 py-3">
                  <Link href={`/admin/materiais/${material.slug}`} className="hover:text-petrol">
                    {material.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {material.colors.map((c) => (
                      <span
                        key={c.name}
                        title={c.name}
                        className="h-4 w-4 rounded-full border border-mist"
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/materiais/${material.slug}`}
                      className="label-caps text-[11px] text-graphite hover:text-petrol"
                    >
                      Editar
                    </Link>
                    <DeleteMaterialButton slug={material.slug} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
