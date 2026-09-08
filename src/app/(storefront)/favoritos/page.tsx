"use client";

import { Breadcrumb } from "@/components/breadcrumb";
import { ButtonLink } from "@/components/button";
import { ProductGrid } from "@/components/product-grid";
import { useWishlist } from "@/contexts/wishlist-context";
import { useProductSnapshot } from "@/hooks/use-product-snapshot";

export default function FavoritosPage() {
  const { slugs } = useWishlist();
  const { getProduct } = useProductSnapshot();
  const products = slugs.map((slug) => getProduct(slug)).filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Favoritos" }]} />
      <h1 className="font-display mb-10 text-3xl sm:text-4xl">Seus favoritos</h1>

      {products.length === 0 ? (
        <div className="border border-paper/15 px-6 py-20 text-center">
          <p className="text-graphite">Você ainda não adicionou produtos aos favoritos.</p>
          <ButtonLink href="/loja" variant="primary" className="mt-6 inline-flex">
            Explorar loja
          </ButtonLink>
        </div>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}
