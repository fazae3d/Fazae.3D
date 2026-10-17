import { EmptyState } from "@/components/admin/empty-state";
import { formatPrice } from "@/lib/format";
import { db } from "@/server/db";

export default async function AdminAbandonedCartsPage() {
  const [carts, optOuts] = await Promise.all([
    db.abandonedCart.findMany({ orderBy: { updatedAt: "desc" }, take: 200 }),
    db.emailOptOut.count(),
  ]);
  const reminded = carts.filter((c) => c.remindedAt).length;
  const totalValue = carts.reduce((sum, c) => sum + c.subtotal, 0);

  return (
    <div>
      <h1 className="font-display text-2xl sm:text-3xl">Carrinhos abandonados</h1>
      <p className="mt-1 mb-8 text-sm text-graphite">
        Quem chegou ao checkout, informou o e-mail e não finalizou. O lembrete por e-mail sai sozinho (1x por dia). {carts.length} carrinho(s) ·{" "}
        {formatPrice(totalValue)} parados · {reminded} já lembrado(s) · {optOuts} pediram para não receber.
      </p>

      {carts.length === 0 ? (
        <EmptyState icon="orders" title="Nenhum carrinho abandonado" description="Quando alguém colocar itens no carrinho e não finalizar, o lembrete automático aparece aqui." />
      ) : (
        <ul className="flex flex-col gap-3">
          {carts.map((cart) => {
            const items = cart.items as { name: string; quantity: number }[];
            return (
              <li key={cart.id} className="border border-mist p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p>
                    {cart.name ? `${cart.name} · ` : ""}
                    <span className="text-graphite">{cart.email}</span>
                  </p>
                  <p className="font-medium">{formatPrice(cart.subtotal)}</p>
                </div>
                <p className="mt-1 text-xs text-graphite">{items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}</p>
                <p className="mt-1 text-xs text-graphite">
                  Última atividade: {cart.updatedAt.toLocaleString("pt-BR", { timeZone: "America/Fortaleza" })} ·{" "}
                  {cart.remindedAt ? "lembrete enviado" : "lembrete pendente"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
