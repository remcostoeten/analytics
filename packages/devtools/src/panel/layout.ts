import { noop } from "@remcostoeten/analytics-shared/noop";

export type Mode = "pill" | "dock" | "float";

export type Tab = "visitors" | "sessions" | "logs" | "speed" | "errors" | "status";

export type Layout = {
  mode: Mode;
  last: Exclude<Mode, "pill">;
  tab: Tab;
  dockHeight: number;
  wide: boolean;
  tall: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type LayoutAction =
  | { type: "mode"; mode: Mode }
  | { type: "toggle" }
  | { type: "tab"; tab: Tab }
  | { type: "wide" }
  | { type: "tall" }
  | { type: "dock-height"; height: number }
  | { type: "move"; x: number; y: number }
  | { type: "resize"; width: number; height: number };

export const tabs: Tab[] = ["visitors", "sessions", "logs", "speed", "errors", "status"];

export const storageKey = "ra-devtools:layout";

export const defaultLayout: Layout = {
  mode: "pill",
  last: "dock",
  tab: "visitors",
  dockHeight: 380,
  wide: false,
  tall: false,
  x: 16,
  y: 16,
  width: 720,
  height: 460,
};

const minDock = 160;
const minWidth = 420;
const minHeight = 240;

function clamp(value: number, low: number, high: number) {
  return Math.min(Math.max(value, low), Math.max(low, high));
}

function isTab(value: string): value is Tab {
  return tabs.some((tab) => tab === value);
}

/**
 * @name layoutReducer
 * @description The panel's position and size: collapsed to the pill, docked to the bottom or
 * floating, the open buffer, and the full-width and full-height toggles. Sizes are clamped to
 * a usable minimum.
 *
 * @example
 * layoutReducer(layout, { type: "toggle" }); // pill to the last open mode and back
 */
export function layoutReducer(state: Layout, action: LayoutAction): Layout {
  switch (action.type) {
    case "mode":
      if (action.mode === state.mode) return state;
      return action.mode === "pill"
        ? { ...state, mode: "pill" }
        : { ...state, mode: action.mode, last: action.mode };
    case "toggle":
      return state.mode === "pill" ? { ...state, mode: state.last } : { ...state, mode: "pill" };
    case "tab":
      return state.tab === action.tab ? state : { ...state, tab: action.tab };
    case "wide":
      return { ...state, wide: !state.wide };
    case "tall":
      return { ...state, tall: !state.tall };
    case "dock-height":
      return { ...state, dockHeight: Math.max(minDock, Math.round(action.height)) };
    case "move":
      return { ...state, x: Math.round(action.x), y: Math.round(action.y) };
    case "resize":
      return {
        ...state,
        width: Math.max(minWidth, Math.round(action.width)),
        height: Math.max(minHeight, Math.round(action.height)),
      };
  }
}

/**
 * @name clampToViewport
 * @description Keeps a floating panel on screen after the window shrinks: right and bottom
 * offsets stay within the viewport, and the size within it.
 *
 * @example
 * clampToViewport(layout, innerWidth, innerHeight);
 */
export function clampToViewport(layout: Layout, width: number, height: number): Layout {
  const panelWidth = clamp(layout.width, minWidth, width - 16);
  const panelHeight = clamp(layout.height, minHeight, height - 16);
  return {
    ...layout,
    width: panelWidth,
    height: panelHeight,
    x: clamp(layout.x, 0, width - panelWidth),
    y: clamp(layout.y, 0, height - panelHeight),
    dockHeight: clamp(layout.dockHeight, minDock, height - 40),
  };
}

/**
 * @name readLayout
 * @description Reads the saved layout for this origin, falling back to the default when
 * storage is empty, blocked or holds something else.
 *
 * @example
 * const layout = readLayout();
 */
export function readLayout(): Layout {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaultLayout;
    const saved: Partial<Layout> = JSON.parse(raw);
    const merged = { ...defaultLayout, ...saved };
    return isTab(merged.tab) ? merged : { ...merged, tab: defaultLayout.tab };
  } catch {
    return defaultLayout;
  }
}

/**
 * @name saveLayout
 * @description Saves the layout for this origin. Storage that is full or blocked is ignored.
 *
 * @example
 * saveLayout(layout);
 */
export function saveLayout(layout: Layout) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(layout));
  } catch {
    noop();
  }
}
