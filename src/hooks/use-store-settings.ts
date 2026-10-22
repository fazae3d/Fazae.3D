"use client";

import { useCallback, useEffect, useState } from "react";
import { getSettingsSnapshotAction } from "@/app/actions/settings";
import type { StoreSettings } from "@/server/types";

/** Matches the seed default in src/server/db.ts, shown only for the instant before the real snapshot loads. */
const INITIAL_SETTINGS: StoreSettings = {
  freeShippingThreshold: 299.9,
  whatsappNumber: "5584999999999",
};

type SettingsSnapshot = Awaited<ReturnType<typeof getSettingsSnapshotAction>>;

/** Mesma ideia do catálogo: vários componentes pedem as configurações ao mesmo tempo, então a primeira chamada é compartilhada por alguns segundos. */
const SETTINGS_TTL_MS = 30_000;
let sharedSettings: { at: number; promise: Promise<SettingsSnapshot> } | null = null;

function loadSettings(force: boolean): Promise<SettingsSnapshot> {
  if (!force && sharedSettings && Date.now() - sharedSettings.at < SETTINGS_TTL_MS) return sharedSettings.promise;
  const promise = getSettingsSnapshotAction();
  sharedSettings = { at: Date.now(), promise };
  promise.catch(() => {
    if (sharedSettings?.promise === promise) sharedSettings = null;
  });
  return promise;
}

/** Client-side store-settings snapshot, fetched via a Server Action on mount, see useProductSnapshot for why this can't be a static import. */
export function useStoreSettings() {
  const [settings, setSettings] = useState<StoreSettings>(INITIAL_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async (force = true) => {
    const snapshot = await loadSettings(force);
    setSettings(snapshot);
    setLoaded(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh(false);
  }, [refresh]);

  return { settings, loaded, refresh };
}
