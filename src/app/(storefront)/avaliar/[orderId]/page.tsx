import type { Metadata } from "next";
import { ButtonLink } from "@/components/button";
import { MagicReviewForm } from "@/components/magic-review-form";
import { ProductPhoto } from "@/components/product-photo";
import { withReadFallback } from "@/lib/db-fallback";
import { findOrderById } from "@/server/repositories/order-repository";
import { getProduct } from "@/server/repositories/product-repository";
import { getReviewForOrderProduct } from "@/server/repositories/review-repository";
import { isValidReviewToken } from "@/server/review-link";
import { REVIEW_REWARD_MIN_SUBTOTAL, REVIEW_REWARD_VALUE, ensureRewardCoupon } from "@/server/review-reward";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = {
  title: "Avalie seu pedido",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function Stars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating} de 5 estrelas`} className="text-petrol">
      {"★".repeat(rating)}
      <span className="text-graphite/40">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export default async function ReviewByLinkPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { orderId } = await params;
  const { t: token } = await searchParams;
  const order = await withReadFallback(() => findOrderById(decodeURIComponent(orderId)), undefined);

  if (!order || !token || !isValidReviewToken(order.id, token, order.userEmail)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <h1 className="font-display text-3xl sm:text-4xl">Link inválido</h1>
        <p className="mt-4 text-graphite">Não conseguimos validar este link de avaliação. Fale com a gente pelo WhatsApp que resolvemos.</p>
        <ButtonLink href="/loja" variant="primary" className="mt-8 inline-flex">
          Ver produtos
        </ButtonLink>
      </div>
    );
  }

  if (order.status !== "Entregue") {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <h1 className="font-display text-3xl sm:text-4xl">Ainda não foi entregue</h1>
        <p className="mt-4 text-graphite">Você poderá avaliar o pedido {order.id} assim que ele chegar. Obrigado pela paciência!</p>
      </div>
    );
  }

  // Só produtos que existem no catálogo podem receber avaliação (itens avulsos/personalizados ficam de fora).
  const slugs = [...new Set(order.items.map((i) => i.productSlug))];
  const entries = (
    await Promise.all(
      slugs.map(async (slug) => {
        const product = await withReadFallback(() => getProduct(slug), undefined);
        if (!product || product.hidden) return null;
        const review = await withReadFallback(() => getReviewForOrderProduct(order.id, slug), undefined);
        return { product, review };
      }),
    )
  ).filter((e): e is NonNullable<typeof e> => e !== null);

  const reviewedAny = entries.some((e) => e.review);
  const couponCode = reviewedAny ? await ensureRewardCoupon(order.id).catch(() => null) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
      <p className="label-caps text-xs text-petrol">Pedido {order.id}</p>
      <h1 className="font-display mt-2 text-3xl sm:text-4xl">Como foi o seu pedido?</h1>
      <p className="mt-3 text-graphite">
        Sua opinião ajuda quem está escolhendo e ajuda a gente a melhorar. Avalie e ganhe{" "}
        <strong className="text-paper">{formatPrice(REVIEW_REWARD_VALUE)} de desconto</strong> na próxima compra (a partir de{" "}
        {formatPrice(REVIEW_REWARD_MIN_SUBTOTAL)}). O desconto vale para qualquer nota, a gente quer o seu feedback sincero.
      </p>

      {couponCode ? (
        <div className="mt-8 rounded-2xl bg-petrol p-5 text-ink">
          <p className="text-xs font-bold uppercase tracking-widest">Obrigado! Seu presente</p>
          <p className="font-display mt-1 text-3xl">{couponCode}</p>
          <p className="mt-2 text-sm font-medium">
            Use no carrinho: {formatPrice(REVIEW_REWARD_VALUE)} de desconto em compras a partir de {formatPrice(REVIEW_REWARD_MIN_SUBTOTAL)}. Uso único.
          </p>
          <ButtonLink href="/loja" variant="secondary" className="mt-4 inline-flex">
            Ver produtos
          </ButtonLink>
        </div>
      ) : null}

      <ul className="mt-8 space-y-5">
        {entries.length === 0 ? (
          <li className="border border-paper/15 p-5 text-sm text-graphite">
            Os itens deste pedido (peças personalizadas) não têm página no catálogo para receber avaliação. Se quiser, conte como foi pelo
            WhatsApp!
          </li>
        ) : null}
        {entries.map(({ product, review }) => (
          <li key={product.slug} className="border border-paper/15 p-5">
            <div className="flex items-center gap-4">
              {product.images?.[0] ? (
                <div className="relative h-16 w-16 shrink-0 overflow-hidden bg-mist">
                  <ProductPhoto src={product.images[0]} alt={product.name} sizes="64px" />
                </div>
              ) : null}
              <p className="font-medium">{product.name}</p>
            </div>
            {review ? (
              <p className="mt-4 text-sm text-graphite">
                Você avaliou: <Stars rating={review.rating} />
                {review.text ? <span className="mt-1 block text-paper">&ldquo;{review.text}&rdquo;</span> : null}
              </p>
            ) : (
              <MagicReviewForm orderId={order.id} token={token} productSlug={product.slug} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
