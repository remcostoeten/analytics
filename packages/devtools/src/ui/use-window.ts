import { useEffect, useReducer, useRef, useState } from "react";
import type { RefObject } from "react";

export type Visible = {
  start: number;
  end: number;
  before: number;
  after: number;
  offsetOf: (index: number) => number;
  sizeOf: (index: number) => number;
  measure: (element: HTMLElement | null) => (() => void) | undefined;
};

/**
 * @name rangeFor
 * @description The rows to render for a scroll position: every row that overlaps the viewport
 * plus `overscan` rows on each side, from measured or estimated row heights.
 *
 * @example
 * rangeFor([24, 24, 120, 24], 30, 40, 0); // { start: 1, end: 3, before: 24, after: 24 }
 */
export function rangeFor(sizes: number[], top: number, height: number, overscan: number) {
  let offset = 0;
  let start = 0;
  while (start < sizes.length && offset + (sizes[start] ?? 0) <= top) {
    offset += sizes[start] ?? 0;
    start += 1;
  }
  const before = offset;
  let end = start;
  while (end < sizes.length && offset < top + height) {
    offset += sizes[end] ?? 0;
    end += 1;
  }
  const first = Math.max(0, start - overscan);
  const last = Math.min(sizes.length, end + overscan);
  const leading = sizes.slice(first, start).reduce((sum, size) => sum + size, 0);
  const trailing = sizes.slice(end, last).reduce((sum, size) => sum + size, 0);
  const total = sizes.reduce((sum, size) => sum + size, 0);
  return {
    start: first,
    end: last,
    before: before - leading,
    after: total - offset - trailing,
  };
}

/**
 * @name useWindow
 * @description Renders only the rows near the viewport of `scroller`. Row heights start at
 * `estimate` and are measured with a `ResizeObserver` through the `measure` ref, so expanded
 * rows keep their real height. Each row element needs `data-key`.
 *
 * @example
 * const view = useWindow(rows.map((row) => row.id), listRef);
 */
export function useWindow(
  keys: string[],
  scroller: RefObject<HTMLElement | null>,
  estimate = 24,
  overscan = 8,
): Visible {
  const measured = useRef(new Map<string, number>());
  const [, bump] = useReducer((value: number) => value + 1, 0);
  const [view, setView] = useState({ top: 0, height: 480 });

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    function update() {
      if (!element) return;
      setView({ top: element.scrollTop, height: element.clientHeight });
    }
    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [scroller]);

  const [tools] = useState(() => {
    const observer = new ResizeObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        const key = entry.target.getAttribute("data-key");
        const size = entry.borderBoxSize[0]?.blockSize ?? entry.contentRect.height;
        if (key && size > 0 && measured.current.get(key) !== size) {
          measured.current.set(key, size);
          changed = true;
        }
      }
      if (changed) bump();
    });
    function measure(element: HTMLElement | null) {
      if (!element) return undefined;
      observer.observe(element);
      return () => observer.unobserve(element);
    }
    return { observer, measure };
  });

  useEffect(() => () => tools.observer.disconnect(), [tools]);

  const sizes = keys.map((key) => measured.current.get(key) ?? estimate);
  const range = rangeFor(sizes, view.top, view.height, overscan);

  return {
    ...range,
    offsetOf: (index) => sizes.slice(0, index).reduce((sum, size) => sum + size, 0),
    sizeOf: (index) => sizes[index] ?? estimate,
    measure: tools.measure,
  };
}
