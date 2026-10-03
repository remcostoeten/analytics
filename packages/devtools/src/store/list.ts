import type { ID, Nullable } from "@remcostoeten/analytics-shared/semantic";

export type Row = { id: ID };

export type ListState<Item extends Row, Detail> = {
  rows: Item[];
  open: Nullable<ID>;
  filter: string;
  details: { [id: ID]: Detail };
  held: boolean;
  loaded: boolean;
};

export type ListAction<Item extends Row, Detail> =
  | { type: "replace"; rows: Item[] }
  | { type: "prepend"; rows: Item[] }
  | { type: "toggle"; id: ID }
  | { type: "open"; id: Nullable<ID> }
  | { type: "filter"; text: string }
  | { type: "detail"; id: ID; detail: Detail }
  | { type: "hold"; held: boolean }
  | { type: "clear" };

export const bufferLimit = 400;

/**
 * @name emptyList
 * @description The starting state of a buffer: no rows, nothing open, no filter.
 *
 * @example
 * const store = createStore(listReducer, emptyList<LogEntry, never>());
 */
export function emptyList<Item extends Row, Detail>(): ListState<Item, Detail> {
  return { rows: [], open: null, filter: "", details: {}, held: false, loaded: false };
}

function unique<Item extends Row>(rows: Item[]) {
  const seen = new Set<ID>();
  return rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

/**
 * @name listReducer
 * @description The reducer every buffer shares. Rows are newest first and capped at 400;
 * `prepend` drops duplicates by id, `replace` swaps the whole list after a poll, and an open
 * row that falls out of the list closes.
 *
 * @example
 * listReducer(state, { type: "prepend", rows: [entry] });
 */
export function listReducer<Item extends Row, Detail>(
  state: ListState<Item, Detail>,
  action: ListAction<Item, Detail>,
): ListState<Item, Detail> {
  switch (action.type) {
    case "replace":
    case "prepend": {
      const merged = action.type === "replace" ? action.rows : [...action.rows, ...state.rows];
      const rows = unique(merged).slice(0, bufferLimit);
      const open = rows.some((row) => row.id === state.open) ? state.open : null;
      return { ...state, rows, open, loaded: true };
    }
    case "toggle":
      return { ...state, open: state.open === action.id ? null : action.id };
    case "open":
      return state.open === action.id ? state : { ...state, open: action.id };
    case "filter":
      return state.filter === action.text ? state : { ...state, filter: action.text };
    case "detail":
      return { ...state, details: { ...state.details, [action.id]: action.detail } };
    case "hold":
      return state.held === action.held ? state : { ...state, held: action.held };
    case "clear":
      return { ...state, rows: [], open: null, details: {} };
  }
}
