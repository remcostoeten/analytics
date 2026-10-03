import { describe, expect, test } from "bun:test";

import {
  clampToViewport,
  defaultLayout,
  layoutReducer,
  readLayout,
  saveLayout,
  storageKey,
} from "../src/panel/layout";
import { nextSelection } from "../src/panel/use-buffer";
import { createStore } from "../src/store/create-store";
import { bufferLimit, emptyList, listReducer } from "../src/store/list";
import type { ListState } from "../src/store/list";
import { rangeFor } from "../src/ui/use-window";

type Row = { id: string };

function rows(count: number, prefix = "r"): Row[] {
  return Array.from({ length: count }, (_, index) => ({ id: `${prefix}${index}` }));
}

function start(): ListState<Row, string> {
  return emptyList<Row, string>();
}

describe("listReducer", () => {
  test("prepends newest first, drops duplicates and caps at 400", () => {
    let state = listReducer(start(), { type: "prepend", rows: rows(3) });
    state = listReducer(state, { type: "prepend", rows: [{ id: "new" }, { id: "r0" }] });
    expect(state.rows.map((row) => row.id)).toEqual(["new", "r0", "r1", "r2"]);
    state = listReducer(state, { type: "prepend", rows: rows(500, "x") });
    expect(state.rows).toHaveLength(bufferLimit);
    expect(state.rows[0]?.id).toBe("x0");
    expect(state.loaded).toBe(true);
  });

  test("replace swaps the list and closes a row that left it", () => {
    let state = listReducer(start(), { type: "replace", rows: rows(2) });
    state = listReducer(state, { type: "toggle", id: "r1" });
    expect(state.open).toBe("r1");
    state = listReducer(state, { type: "replace", rows: [{ id: "r0" }] });
    expect(state.open).toBeNull();
  });

  test("toggle opens and closes, open sets one row", () => {
    let state = listReducer(start(), { type: "toggle", id: "a" });
    expect(state.open).toBe("a");
    state = listReducer(state, { type: "toggle", id: "a" });
    expect(state.open).toBeNull();
    state = listReducer(state, { type: "open", id: "b" });
    expect(state.open).toBe("b");
  });

  test("keeps the same state object when nothing changes", () => {
    const state = start();
    expect(listReducer(state, { type: "filter", text: "" })).toBe(state);
    expect(listReducer(state, { type: "hold", held: false })).toBe(state);
  });

  test("stores details and clears everything but the filter", () => {
    let state = listReducer(start(), { type: "filter", text: "level:error" });
    state = listReducer(state, { type: "prepend", rows: rows(2) });
    state = listReducer(state, { type: "detail", id: "r0", detail: "signals" });
    expect(state.details).toEqual({ r0: "signals" });
    state = listReducer(state, { type: "clear" });
    expect(state.rows).toEqual([]);
    expect(state.details).toEqual({});
    expect(state.filter).toBe("level:error");
  });
});

describe("createStore", () => {
  test("notifies listeners only on a new state", () => {
    const store = createStore(listReducer<Row, string>, start());
    let calls = 0;
    const stop = store.subscribe(() => {
      calls += 1;
    });
    store.dispatch({ type: "filter", text: "" });
    store.dispatch({ type: "filter", text: "bot:>0.5" });
    stop();
    store.dispatch({ type: "filter", text: "x" });
    expect(calls).toBe(1);
    expect(store.get().filter).toBe("x");
  });
});

describe("layoutReducer", () => {
  test("toggle goes from the pill to the last open mode and back", () => {
    let layout = layoutReducer(defaultLayout, { type: "mode", mode: "float" });
    layout = layoutReducer(layout, { type: "toggle" });
    expect(layout.mode).toBe("pill");
    layout = layoutReducer(layout, { type: "toggle" });
    expect(layout.mode).toBe("float");
  });

  test("sizes have a minimum", () => {
    const layout = layoutReducer(defaultLayout, { type: "resize", width: 10, height: 10 });
    expect([layout.width, layout.height]).toEqual([420, 240]);
    expect(layoutReducer(defaultLayout, { type: "dock-height", height: 20 }).dockHeight).toBe(160);
  });

  test("clampToViewport keeps a floating panel on screen", () => {
    const layout = clampToViewport({ ...defaultLayout, x: 2000, y: 900, width: 900 }, 800, 600);
    expect(layout.width).toBe(784);
    expect(layout.x).toBe(16);
    expect(layout.y).toBe(600 - layout.height);
  });

  test("saved layouts survive a reload and bad storage falls back", () => {
    saveLayout({ ...defaultLayout, tab: "logs", mode: "dock" });
    expect(readLayout().tab).toBe("logs");
    localStorage.setItem(storageKey, '{"tab":"nope"}');
    expect(readLayout().tab).toBe("visitors");
    localStorage.setItem(storageKey, "not json");
    expect(readLayout()).toEqual(defaultLayout);
    localStorage.removeItem(storageKey);
  });
});

describe("nextSelection", () => {
  test("moves within the list", () => {
    const ids = ["a", "b", "c"];
    expect(nextSelection(ids, null, 1)).toBe("a");
    expect(nextSelection(ids, "a", 1)).toBe("b");
    expect(nextSelection(ids, "c", 1)).toBe("c");
    expect(nextSelection(ids, "a", -1)).toBe("a");
    expect(nextSelection([], "a", 1)).toBeNull();
  });
});

describe("rangeFor", () => {
  test("renders the rows in view plus overscan", () => {
    const sizes = Array.from({ length: 100 }, () => 24);
    expect(rangeFor(sizes, 240, 120, 2)).toEqual({ start: 8, end: 17, before: 192, after: 1992 });
  });

  test("uses measured heights", () => {
    expect(rangeFor([24, 24, 120, 24], 30, 40, 0)).toEqual({
      start: 1,
      end: 3,
      before: 24,
      after: 24,
    });
  });
});
