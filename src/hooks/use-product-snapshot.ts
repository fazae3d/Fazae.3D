"use client";

import { useCallback, useEffect, useState } from "react";
import { getCatalogSnapshotAction } from "@/app/actions/catalog";
import type { Category, Product } from "@/lib/types";

type Snapshot = Awaited<ReturnType<typeof getCatalogSnapshotAction>>;

/**
 * Vários componentes da mesma página (carrinho, busca, recentes, favoritos...) usam este hook e cada um disparava a sua própria
 * chamada ao servidor, buscando o catálogo inteiro várias vezes por visita. Agora a primeira chamada é compartilhada por todos
 * durante alguns segundos; `refresh()` continua forçando uma leitura nova.
 */
const SNAPSHOT_TTL_MS = 30_000;
let sharedSnapshot: { at: number; promise: Promise<Snapshot> } | null = null;

function loadSnapshot(force: boolean): Promise<Snapshot> {
  if (!force && sharedSnapshot && Date.now() - sharedSnapshot.at < SNAPSHOT_TTL_MS) return sharedSnapshot.promise;
  const promise = getCatalogSnapshotAction();
  sharedSnapshot = { at: Date.now(), promise };
  promise.catch(() => {
    if (sharedSnapshot?.promise === promise) sharedSnapshot = null;
  });
  return promise;
}

/**
 * Client-side catalog snapshot, fetched via a Server Action on mount.
 * Every consumer of this hook gets its own copy — call `refresh()` at a
 * point where staleness would actually matter (e.g. opening the cart)
 * rather than polling.
 */
export function useProductSnapshot(options?: { enabled?: boolean }) {
  const enabled = options?.enabled ?? true;
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async (force = true) => {
    const snapshot = await loadSnapshot(force);
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
    // `enabled: false` adia a busca até ser necessária (ex.: busca do topo só carrega o catálogo quando é aberta).
    if (!enabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh(false);
  }, [refresh, enabled]);

  const getProduct = useCallback((slug: string) => products.find((p) => p.slug === slug), [products]);
  const getCategory = useCallback((slug: string) => categories.find((c) => c.slug === slug), [categories]);

  return { products, categories, loaded, refresh, getProduct, getCategory };
}
