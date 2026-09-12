import Link from "next/link";
import { getAllCustomersWithStats } from "@/server/repositories/customer-repository";
import { formatPrice } from "@/lib/format";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackCustomersWithStats } from "@/server/demo-fallback";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim().toLowerCase() ?? "";

  const customers = await withReadFallback(() => getAllCustomersWithStats(), fallbackCustomersWithStats);

  const rows = customers
    .filter(
      (c) =>
        !query ||
        c.name.toLowerCase().includes(query) ||
        c.phone.toLowerCase().includes(query) ||
        (c.email ?? "").toLowerCase().includes(query),
    )
    .sort((a, b) => b.totalSpent - a.totalSpent);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">Clientes</h1>
          <p className="mt-1 text-sm text-graphite">
            {rows.length} de {customers.length} cliente(s)
          </p>
        </div>
        <Link
          href="/admin/clientes/novo"
          className="label-caps border border-ink px-5 py-2.5 text-xs transition-colors hover:bg-ink hover:text-paper"
        >
          Novo cliente
        </Link>
      </div>

      <form className="mb-6 flex flex-wrap gap-3" action="/admin/clientes">
        <input
          type="text"
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Buscar por nome, telefone ou e-mail"
          className="min-w-[240px] flex-1 border border-mist px-3 py-2.5 text-base outline-none focus:border-petrol sm:text-sm"
        />
        <button
          type="submit"
          className="label-caps border border-ink px-5 py-2.5 text-xs transition-colors hover:bg-ink hover:text-paper"
        >
          Buscar
        </button>
        {params.q && (
          <Link
            href="/admin/clientes"
            className="label-caps flex items-center px-2 text-[11px] text-graphite hover:text-petrol"
          >
            Limpar
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <div className="border border-mist px-6 py-16 text-center text-graphite">
          Nenhum cliente encontrado para essa busca.
        </div>
      ) : (
        <div className="overflow-x-auto border border-mist">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-mist bg-mist/30">
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Nome</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Telefone</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">E-mail</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Tags</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Pedidos</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Total gasto</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {rows.map((customer) => (
                <tr key={customer.id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/clientes/${customer.id}`} className="hover:text-petrol">
                      {customer.name || "(sem nome)"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-graphite">{customer.phone}</td>
                  <td className="px-4 py-3 text-graphite">{customer.email ?? "Não informado"}</td>
                  <td className="px-4 py-3">
                    {customer.tags.length === 0 ? (
                      <span className="text-graphite">Sem tags</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {customer.tags.map((tag) => (
                          <span
                            key={tag}
                            className="label-caps border border-mist px-2 py-0.5 text-[10px] text-graphite"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">{customer.orderCount}</td>
                  <td className="px-4 py-3">{formatPrice(customer.totalSpent)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/clientes/${customer.id}`}
                      className="label-caps text-[11px] text-graphite hover:text-petrol"
                    >
                      Ver detalhes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
