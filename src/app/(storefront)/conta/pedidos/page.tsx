import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { Breadcrumb } from "@/components/breadcrumb";
import { ButtonLink } from "@/components/button";
import { ReorderButton } from "@/components/reorder-button";
import { ReviewCta } from "@/components/review-cta";
import { formatPrice } from "@/lib/format";
import { findOrdersByEmail } from "@/server/repositories/order-repository";
import { isEmailVerified } from "@/server/repositories/user-repository";
import { ResendVerification } from "@/components/resend-verification";
import { BoletoInstructions, PixInstructions } from "@/components/checkout/step-confirmacao";
import { getPendingPaymentInstructions } from "@/lib/mercadopago";
import { withReadFallback } from "@/lib/db-fallback";

export const metadata: Metadata = {
  title: "Meus pedidos",
};

export default async function PedidosPage() {
  const session = await auth();
  // TODO(fase DB): remove o fallback quando a Fazaê tiver o próprio banco, hoje a leitura real falharia sem Supabase configurado.
  const email = session?.user?.email;
  // Conta sem e-mail confirmado não vê pedidos: quem cadastra o e-mail de outra pessoa não pode ler o histórico dela.
  const verified = email ? await withReadFallback(() => isEmailVerified(email), false) : false;
  const orders = email && verified ? await withReadFallback(() => findOrdersByEmail(email), []) : [];
  // Pedidos com Pix/boleto ainda por pagar: busca o QR/boleto de novo no Mercado Pago para a pessoa pagar daqui.
  const pendingPayments = new Map(
    await Promise.all(
      orders
        .filter(
          (o) =>
            o.status === "Pedido recebido" &&
            o.mpPaymentId &&
            (o.paymentStatus === "pending" || o.paymentStatus === "in_process") &&
            (o.paymentMethod === "pix" || o.paymentMethod === "boleto"),
        )
        .map(async (o) => [o.id, await getPendingPaymentInstructions(o.mpPaymentId!)] as const),
    ),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[
          { label: "Início", href: "/" },
          { label: "Minha conta", href: "/conta" },
          { label: "Meus pedidos" },
        ]}
      />
      <h1 className="font-display mb-10 text-3xl sm:text-4xl">Meus pedidos</h1>

      {email && !verified ? (
        <ResendVerification />
      ) : orders.length === 0 ? (
        <div className="border border-paper/15 px-6 py-20 text-center">
          <p className="text-graphite">Você ainda não fez nenhum pedido.</p>
          <ButtonLink href="/loja" variant="primary" className="mt-6 inline-flex">
            Explorar loja
          </ButtonLink>
        </div>
      ) : (
        <ul className="space-y-6">
          {orders.map((order) => (
            <li key={order.id} className="border border-paper/15 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper/15 pb-4">
                <div>
                  <p className="text-sm text-paper">Pedido {order.id}</p>
                  <p className="text-xs text-graphite">
                    {new Date(order.createdAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span className="label-caps bg-petrol px-3 py-1.5 text-[10px] text-ink">{order.status}</span>
              </div>

              {pendingPayments.get(order.id) && (
                <div className="flex justify-center py-5">
                  {order.paymentMethod === "pix" ? (
                    <PixInstructions
                      qrCode={pendingPayments.get(order.id)!.qrCode}
                      qrCodeBase64={pendingPayments.get(order.id)!.qrCodeBase64}
                    />
                  ) : (
                    <BoletoInstructions ticketUrl={pendingPayments.get(order.id)!.ticketUrl} />
                  )}
                </div>
              )}

              <ul className="divide-y divide-paper/15">
                {order.items.map((item) => (
                  <li key={`${item.productSlug}-${item.material}-${item.color}`} className="py-3 text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <Link href={`/produto/${item.productSlug}`} className="hover:text-petrol">
                          {item.name}
                        </Link>
                        <p className="text-xs text-graphite">
                          {item.categoryName} · {item.material} · {item.color}{item.scale ? ` · ${item.scale}` : ""} · Qtd {item.quantity}
                        </p>
                      </div>
                      <span>{formatPrice(item.price * item.quantity)}</span>
                    </div>
                    {order.status === "Entregue" && (
                      <ReviewCta orderId={order.id} productSlug={item.productSlug} productName={item.name} />
                    )}
                  </li>
                ))}
              </ul>

              <div className="mt-3 space-y-1 border-t border-paper/15 pt-4 text-sm">
                {order.discount > 0 && (
                  <div className="flex justify-between text-petrol">
                    <span>Desconto {order.couponCode ? `(${order.couponCode})` : ""}</span>
                    <span>-{formatPrice(order.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium">
                  <span className="text-graphite">Total</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>

              {order.tracking && (
                <p className="mt-4 text-xs text-graphite">
                  Código de rastreio: <span className="text-paper">{order.tracking}</span>
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-5">
                <Link
                  href={`/rastreamento?pedido=${order.id}`}
                  className="label-caps mt-2 inline-block text-[11px] text-petrol hover:underline"
                >
                  Rastrear pedido
                </Link>
                <ReorderButton items={order.items} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
