import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { UnidentifiedOrders, type UnidentifiedGroup } from "@/components/admin/unidentified-orders";
import { withReadFallback } from "@/lib/db-fallback";
import { getAllCustomers, getUnidentifiedOrders } from "@/server/repositories/customer-repository";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pedidos sem cadastro" };

/** "Iasmin", "iasmin " e "IASMIN" são a mesma pessoa; acento também não conta. */
function nameKey(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export default async function UnidentifiedOrdersPage() {
  const [orders, customers] = await Promise.all([withReadFallback(() => getUnidentifiedOrders(), []), withReadFallback(() => getAllCustomers(), [])]);

  const byName = new Map<string, UnidentifiedGroup & { names: Map<string, number> }>();
  for (const order of orders) {
    const key = nameKey(order.customerName) || `sem-nome-${order.id}`;
    const group = byName.get(key) ?? { key, name: order.customerName, orderIds: [], total: 0, lastAt: order.createdAt, names: new Map<string, number>() };
    group.orderIds.push(order.id);
    group.total += order.total;
    if (order.createdAt > group.lastAt) group.lastAt = order.createdAt;
    group.names.set(order.customerName, (group.names.get(order.customerName) ?? 0) + 1);
    byName.set(key, group);
  }
  const customerByName = new Map(customers.map((c) => [nameKey(c.name), c]));
  const groups: UnidentifiedGroup[] = [...byName.values()]
    .map(({ names, ...group }) => ({
      ...group,
      // O nome mais usado nos pedidos do grupo (com a grafia que a pessoa digitou).
      name: [...names.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? group.name,
      suggestedPhone: customerByName.get(group.key)?.phone,
    }))
    .sort((a, b) => b.orderIds.length - a.orderIds.length || b.total - a.total);

  const totalOrders = orders.length;

  return (
    <div>
      <PageHeader
        title="Pedidos sem cadastro"
        description={
          totalOrders > 0
            ? `${totalOrders} pedido(s) de ${groups.length} cliente(s) ficaram sem telefone. Sem ele, o sistema não sabe quem recomprou, nem consegue avisar ou chamar de volta. Informe o telefone de cada um: todos os pedidos daquele nome são atualizados de uma vez.`
            : "Todos os pedidos de balcão e de WhatsApp têm cliente identificado."
        }
      />
      {groups.length === 0 ? (
        <EmptyState icon="settings" title="Tudo identificado" description="Quando uma venda for lançada sem telefone, ela aparece aqui para você completar." />
      ) : (
        <UnidentifiedOrders groups={groups} />
      )}
    </div>
  );
}
