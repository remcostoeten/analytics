import type { ClickCount } from "./page-reads";

export type ClickMark = { element: HTMLElement; label: string };

export type ClickRow = { label: string; count: number; onPage: boolean };

export type BadgeBox = {
  label: string;
  count: number;
  top: number;
  left: number;
  width: number;
  height: number;
};

const clickSelector = "[data-spoar-click],[data-ra-click]";

/**
 * @name clickMarks
 * @description The elements on a page that the SDK's `clicks` plugin tracks, each with its label:
 * the `data-spoar-click` value, or the older `data-ra-click` one.
 *
 * @example
 * clickMarks(document).map((mark) => mark.label); // ["upgrade", "signup"]
 */
export function clickMarks(root: ParentNode): ClickMark[] {
  return Array.from(root.querySelectorAll<HTMLElement>(clickSelector), (element) => ({
    element,
    label: element.dataset.spoarClick ?? element.dataset.raClick ?? "",
  }));
}

/**
 * @name clickRows
 * @description Merges the click counts read for a path with the labels marked on the page: every
 * counted label, flagged when no element on the page carries it, then the marked labels nobody
 * clicked, at zero.
 *
 * @example
 * clickRows([{ label: "upgrade", count: 4 }], ["upgrade", "signup"]);
 * // [{ label: "upgrade", count: 4, onPage: true }, { label: "signup", count: 0, onPage: true }]
 */
export function clickRows(counts: ClickCount[], labels: string[]): ClickRow[] {
  const marked = new Set(labels.filter((label) => label !== ""));
  const counted = counts.map((row) => ({ ...row, onPage: marked.has(row.label) }));
  const seen = new Set(counts.map((row) => row.label));
  const unclicked = [...marked]
    .filter((label) => !seen.has(label))
    .map((label) => ({ label, count: 0, onPage: true }));
  return [...counted, ...unclicked];
}

/**
 * @name badgeBoxes
 * @description Where to draw each marked element's outline and count, from its bounding box in
 * the viewport. Elements that are hidden or scrolled fully out of view are left out.
 *
 * @example
 * badgeBoxes(clickMarks(document), new Map([["upgrade", 4]]), { width: 1280, height: 720 });
 */
export function badgeBoxes(
  marks: ClickMark[],
  counts: Map<string, number>,
  viewport: { width: number; height: number },
): BadgeBox[] {
  return marks.flatMap((mark) => {
    const rect = mark.element.getBoundingClientRect();
    const hidden = rect.width === 0 && rect.height === 0;
    const outside =
      rect.bottom < 0 || rect.right < 0 || rect.top > viewport.height || rect.left > viewport.width;
    if (hidden || outside) return [];
    return [
      {
        label: mark.label,
        count: counts.get(mark.label) ?? 0,
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      },
    ];
  });
}
