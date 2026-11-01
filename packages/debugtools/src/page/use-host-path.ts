import type { Milliseconds } from "@spoar/shared/semantic";
import { useEffect, useState } from "react";

/**
 * @name useHostPath
 * @description The host page's `location.pathname`, kept current while the component is mounted:
 * on `popstate` for back and forward, and on a light poll for SPA routers that call
 * `history.pushState`, which fires no event.
 *
 * @example
 * const path = useHostPath(); // "/pricing"
 */
export function useHostPath(pollMs: Milliseconds = 1000): string {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    function sync() {
      setPath(window.location.pathname);
    }
    window.addEventListener("popstate", sync);
    const timer = window.setInterval(sync, pollMs);
    return () => {
      window.removeEventListener("popstate", sync);
      window.clearInterval(timer);
    };
  }, [pollMs]);

  return path;
}
