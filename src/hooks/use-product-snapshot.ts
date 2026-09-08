"use client";

import { useCallback, useEffect, useState } from "react";
import { getCatalogSnapshotAction } from "@/app/actions/catalog";
import type { Category, Product } from "@/lib/types";

/**
 * Client-side catalog snapshot, fetched via a Server Action on mount.
 * Every consumer of this hook gets its own copy — call `refresh()` at a
 * point where staleness would actually matter (e.g. opening the cart)
 * rather than polling.
 */
export function useProductSnapshot() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const snapshot = await getCatalogSnapshotAction();
    setProducts(snapshot.products);
    setCategories(snapshot.categories);
    setLoaded(true);
  }, []);

  useEffect(() => {
    // Fetching an async snapshot on mount has no synchronous-external-store
    // equivalent (unlike the localStorage cart/wishlist, there's nothing to
    // subscribe to here) — the lint rule's heuristic doesn't distinguish
    // this from a derived-state anti-pattern, but this genuinely is the
    // documented "fetch in an effect" shape.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  const getProduct = useCallback((slug: string) => products.find((p) => p.slug === slug), [products]);
  const getCategory = useCallback((slug: string) => categories.find((c) => c.slug === slug), [categories]);

  return { products, categories, loaded, refresh, getProduct, getCategory };
}
