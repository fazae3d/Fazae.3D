import { itemSpecsInline } from "@/lib/order-item";
import { isAdminRequest } from "@/lib/admin-guard";
import { csvResponse, toCsv } from "@/lib/csv";
import { storeDayKey } from "@/lib/store-time";
import { getAllOrders } from "@/server/repositories/order-repository";

/** Pedidos em CSV (Excel) para o contador: um pedido por linha. */
export async function GET() {
  if (!(await isAdminRequest())) return new Response("Acesso restrito ao administrador.", { status: 403 });

  const orders = await getAllOrders();
  const rows = orders.map((o) => [
    o.id,
    storeDayKey(new Date(o.createdAt)).split("-").reverse().join("/"),
    o.channel,
    o.customerName ?? o.address?.recipient ?? "",
    o.userEmail ?? "",
    o.customerPhone ?? "",
    o.items.map((i) => `${i.quantity}x ${i.name}${itemSpecsInline(i) ? ` (${itemSpecsInline(i)})` : ""}`).join(" | "),
    o.subtotal,
    o.shipping,
    o.discount,
    o.total,
    o.paymentMethod,
    o.paymentStatus ?? "",
    o.status,
    o.tracking ?? "",
    o.shippingMethod ?? "",
    o.address ? `${o.address.city}/${o.address.state}` : "",
    o.couponCode ?? "",
  ]);
  const csv = toCsv(
    ["Pedido", "Data", "Canal", "Cliente", "E-mail", "Telefone", "Itens", "Subtotal", "Frete", "Desconto", "Total", "Pagamento", "Status do pagamento", "Status", "Rastreio", "Forma de entrega", "Cidade/UF", "Cupom"],
    rows,
  );
  return csvResponse(`pedidos-fazae-${storeDayKey(new Date())}.csv`, csv);
}
