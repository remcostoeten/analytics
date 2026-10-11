import { noop } from "@spoar/shared/noop";

export type PanelMode = "docked" | "maximized" | "floating";

export type PanelRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PanelLayout = {
  mode: PanelMode;
  dockedHeight: number;
  floating: PanelRect;
};

export type Viewport = {
  width: number;
  height: number;
};

const storageKey = "spoar-debugtools-panel";
const minDocked = 160;
const minWidth = 420;
const minHeight = 260;
const edge = 8;

export const defaultLayout: PanelLayout = {
  mode: "docked",
  dockedHeight: 380,
  floating: { x: 80, y: 80, width: 900, height: 560 },
};

function clamp(value: number, low: number, high: number) {
  return Math.min(Math.max(value, low), Math.max(low, high));
}

function isMode(value: string): value is PanelMode {
  return value === "docked" || value === "maximized" || value === "floating";
}

/**
 * @name fitLayout
 * @description Keeps a panel layout inside the viewport: the docked height between 160 px and the
 * viewport less 40 px, and the floating window at least 420 by 260 px, no larger than the viewport
 * and with its title bar on screen.
 *
 * @example
 * fitLayout(layout, { width: window.innerWidth, height: window.innerHeight });
 */
export function fitLayout(layout: PanelLayout, viewport: Viewport): PanelLayout {
  const width = clamp(layout.floating.width, minWidth, viewport.width - edge * 2);
  const height = clamp(layout.floating.height, minHeight, viewport.height - edge * 2);
  return {
    mode: layout.mode,
    dockedHeight: clamp(layout.dockedHeight, minDocked, viewport.height - 40),
    floating: {
      width,
      height,
      x: clamp(layout.floating.x, edge, viewport.width - width - edge),
      y: clamp(layout.floating.y, edge, viewport.height - height - edge),
    },
  };
}

/**
 * @name readLayout
 * @description The panel layout this browser saved last, or the default: docked at 380 px. A
 * missing, unreadable or blocked storage answers the default.
 *
 * @example
 * const layout = readLayout(window.localStorage);
 */
export function readLayout(storage: Pick<Storage, "getItem">): PanelLayout {
  try {
    const saved = storage.getItem(storageKey);
    if (!saved) return defaultLayout;
    // Written by saveLayout from a PanelLayout; each field is checked below.
    const parsed = JSON.parse(saved) as Partial<PanelLayout>;
    const floating = parsed.floating ?? defaultLayout.floating;
    return {
      mode: parsed.mode && isMode(parsed.mode) ? parsed.mode : defaultLayout.mode,
      dockedHeight: Number(parsed.dockedHeight) || defaultLayout.dockedHeight,
      floating: {
        x: Number(floating.x) || defaultLayout.floating.x,
        y: Number(floating.y) || defaultLayout.floating.y,
        width: Number(floating.width) || defaultLayout.floating.width,
        height: Number(floating.height) || defaultLayout.floating.height,
      },
    };
  } catch {
    return defaultLayout;
  }
}

/**
 * @name saveLayout
 * @description Remembers the panel layout in this browser; a full or blocked storage is ignored.
 *
 * @example
 * saveLayout(window.localStorage, layout);
 */
export function saveLayout(storage: Pick<Storage, "setItem">, layout: PanelLayout) {
  try {
    storage.setItem(storageKey, JSON.stringify(layout));
  } catch {
    noop();
  }
}
