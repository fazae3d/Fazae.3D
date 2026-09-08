"use client";

import { useCallback } from "react";
import { useSyncExternalStore } from "react";
import { createLocalStore } from "@/lib/local-store";

const MAX_ITEMS = 8;
const recentlyViewedStore = createLocalStore<string[]>("flx-recently-viewed", []);

export function useRecentlyViewed() {
  const slugs = useSyncExternalStore(
    recentlyViewedStore.subscribe,
    recentlyViewedStore.getSnapshot,
    recentlyViewedStore.getServerSnapshot,
  );

  const markViewed = useCallback((slug: string) => {
    recentlyViewedStore.setValue((prev) => [slug, ...prev.filter((s) => s !== slug)].slice(0, MAX_ITEMS));
  }, []);

  return { slugs, markViewed };
}
