import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/**
 * @name useHydrated
 * @description False while React hydrates server HTML and true on every later render, including
 * mounts after a client navigation. Browser-only reads gate on it so the first client render
 * matches the server, even when a streamed boundary hydrates after the read has resolved.
 *
 * @example
 * const hydrated = useHydrated();
 * if (!hydrated || read.data === undefined) return { status: "loading" };
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
