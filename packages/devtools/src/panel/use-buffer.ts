import type { ID, Nullable } from "@spoar/shared/semantic";
import { useEffect, useState } from "react";

import type { ListStore } from "./runtime";
import type { Controller } from "./types";

export type BufferState = {
  selected: Nullable<ID>;
  menu: boolean;
  select: (id: Nullable<ID>) => void;
  closeMenu: () => void;
};

/**
 * @name nextSelection
 * @description The row j and k land on: one step down or up from the selected row, staying
 * inside the list, starting at the first row when nothing is selected.
 *
 * @example
 * nextSelection(["a", "b", "c"], "b", 1); // "c"
 */
export function nextSelection(ids: ID[], selected: Nullable<ID>, delta: number): Nullable<ID> {
  if (ids.length === 0) return null;
  const index = selected === null ? -1 : ids.indexOf(selected);
  if (index < 0) return ids[0] ?? null;
  return ids[Math.min(ids.length - 1, Math.max(0, index + delta))] ?? null;
}

/**
 * @name useBuffer
 * @description The keyboard side of a buffer: the selected row, j and k to move it, Enter to
 * expand it and Shift+F10 to open its menu, registered with the panel as a `Controller`.
 *
 * @example
 * const buffer = useBuffer(runtime.logs, rows, register, (row) => runtime.logs.dispatch({ type: "toggle", id: row.id }));
 */
export function useBuffer<Item extends { id: ID }, Detail>(
  store: ListStore<Item, Detail>,
  rows: Item[],
  register: (controller: Controller) => void,
  expand: (row: Item) => void,
): BufferState {
  const [selected, setSelected] = useState<Nullable<ID>>(null);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const ids = rows.map((row) => row.id);
    register({
      move: (delta) => setSelected((current) => nextSelection(ids, current, delta)),
      activate: () => {
        const row = rows.find((item) => item.id === selected);
        if (row) expand(row);
      },
      menu: () => {
        if (selected !== null) setMenu(true);
      },
    });
  }, [rows, selected, store]);

  return { selected, menu, select: setSelected, closeMenu: () => setMenu(false) };
}
