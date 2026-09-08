"use client";

import { useCallback, useEffect, useState } from "react";
import { getSettingsSnapshotAction } from "@/app/actions/settings";
import type { StoreSettings } from "@/server/types";

/** Matches the seed default in src/server/db.ts — shown only for the instant before the real snapshot loads. */
const INITIAL_SETTINGS: StoreSettings = {
  freeShippingThreshold: 299.9,
  whatsappNumber: "5584999999999",
};

/** Client-side store-settings snapshot, fetched via a Server Action on mount — see useProductSnapshot for why this can't be a static import. */
export function useStoreSettings() {
  const [settings, setSettings] = useState<StoreSettings>(INITIAL_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const snapshot = await getSettingsSnapshotAction();
    setSettings(snapshot);
    setLoaded(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  return { settings, loaded, refresh };
}
