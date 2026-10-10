import type { Milliseconds } from "@spoar/shared/semantic";
import { useCallback, useEffect, useState } from "react";

const tick: Milliseconds = 32;

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * @name usePlayback
 * @description Drives the console's playback clock. Returns the elapsed time within the current
 * cycle and a `restart` function. When `playing` is false or the viewer prefers reduced motion,
 * the clock rests at `rest`, the moment where everything is typed.
 *
 * @example
 * const { elapsed, restart } = usePlayback(cycle, cycle - pace.hold, true, true);
 */
export function usePlayback(
  cycle: Milliseconds,
  rest: Milliseconds,
  playing: boolean,
  loop: boolean,
) {
  const [elapsed, setElapsed] = useState<Milliseconds>(playing ? 0 : rest);
  const [origin, setOrigin] = useState(0);

  useEffect(() => {
    if (!playing || prefersReducedMotion()) {
      setElapsed(rest);
      return;
    }
    const startedAt = performance.now();
    setElapsed(0);
    const timer = setInterval(() => {
      const time = performance.now() - startedAt;
      if (!loop && time >= cycle) {
        setElapsed(rest);
        clearInterval(timer);
        return;
      }
      setElapsed(time % cycle);
    }, tick);
    return () => clearInterval(timer);
  }, [cycle, rest, playing, loop, origin]);

  const restart = useCallback(() => setOrigin((value) => value + 1), []);

  return { elapsed, restart };
}
