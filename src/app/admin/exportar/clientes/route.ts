import { isAdminRequest } from "@/lib/admin-guard";
import { csvResponse, toCsv } from "@/lib/csv";
import { storeDayKey } from "@/lib/store-time";
import { getAllCustomersWithStats } from "@/server/repositories/customer-repository";

/** Clientes em CSV (Excel), com total gasto, para campanhas e contato. */
export async function GET() {
  if (!(await isAdminRequest())) return new Response("Acesso restrito ao administrador.", { status: 403 });

  const customers = await getAllCustomersWithStats();
  const rows = customers.map((c) => [c.name, c.phone, c.email ?? "", c.totalSpent, c.orderCount]);
  return csvResponse(
    `clientes-fazae-${storeDayKey(new Date())}.csv`,
    toCsv(["Nome", "Telefone", "E-mail", "Total gasto", "Pedidos"], rows),
  );
}
