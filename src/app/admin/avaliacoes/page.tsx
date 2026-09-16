import Link from "next/link";
import { getAllReviewsForAdmin } from "@/server/repositories/review-repository";
import { getAllProducts } from "@/lib/demo-data";
import { ReviewRowActions } from "@/components/admin/review-row-actions";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackProducts } from "@/server/demo-fallback";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function AdminReviewsPage() {
  const [reviews, products] = await Promise.all([
    withReadFallback(() => getAllReviewsForAdmin(), []),
    withReadFallback(() => getAllProducts(), fallbackProducts),
  ]);
  const productNameBySlug = new Map(products.map((p) => [p.slug, p.name]));

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl sm:text-3xl">Avaliações</h1>
        <p className="mt-1 text-sm text-graphite">
          {reviews.length} avaliaç{reviews.length === 1 ? "ão" : "ões"} — só clientes com pedido entregue podem
          avaliar.
        </p>
      </div>

      {reviews.length === 0 ? (
        <div className="border border-mist px-6 py-16 text-center text-graphite">Nenhuma avaliação ainda.</div>
      ) : (
        <div className="overflow-x-auto border border-mist">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-mist bg-mist/30">
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Produto</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Autor</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Nota</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Comentário</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Pedido</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Data</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Status</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {reviews.map((review) => (
                <tr key={review.id} className={review.hidden ? "opacity-50" : undefined}>
                  <td className="px-4 py-3">
                    <Link href={`/produto/${review.productSlug}`} className="hover:text-petrol">
                      {productNameBySlug.get(review.productSlug) ?? review.productSlug}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-graphite">{review.authorName}</td>
                  <td className="px-4 py-3">{"★".repeat(review.rating)}</td>
                  <td className="max-w-[280px] truncate px-4 py-3 text-graphite" title={review.text}>
                    {review.text ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-graphite">
                    <Link href={`/admin/pedidos?q=${review.orderId}`} className="hover:text-petrol">
                      {review.orderId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-graphite">{formatDate(review.createdAt)}</td>
                  <td className="px-4 py-3">
                    {review.hidden ? (
                      <span className="label-caps text-[10px] text-graphite">Oculta</span>
                    ) : (
                      <span className="label-caps text-[10px] text-petrol">Visível</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ReviewRowActions id={review.id} hidden={review.hidden} />
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
