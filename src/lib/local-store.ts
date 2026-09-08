/**
 * Minimal localStorage-backed external store, read via useSyncExternalStore.
 * Avoids the SSR/client hydration mismatch and "setState in effect" pitfalls
 * that a plain useState + useEffect(localStorage) pair runs into.
 */
export function createLocalStore<T>(key: string, initial: T) {
  let value = initial;
  let hasLoaded = false;
  const listeners = new Set<() => void>();

  function load(): T {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  }

  function getSnapshot() {
    if (!hasLoaded && typeof window !== "undefined") {
      value = load();
      hasLoaded = true;
    }
    return value;
  }

  function getServerSnapshot() {
    return initial;
  }

  function subscribe(callback: () => void) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  }

  function setValue(next: T | ((prev: T) => T)) {
    value = typeof next === "function" ? (next as (prev: T) => T)(value) : next;
    hasLoaded = true;
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
    listeners.forEach((listener) => listener());
  }

  return { getSnapshot, getServerSnapshot, subscribe, setValue };
}
