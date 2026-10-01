import type { WireEvent } from "@remcostoeten/analytics-contract";
import { noop } from "@remcostoeten/analytics-shared/noop";

import type { Props } from "./types";

type Saved = {
  visitor?: string;
  userId?: string;
  traits?: Props;
  props?: Props;
  experiments?: Props;
  optOut?: boolean;
  consent?: "granted" | "denied";
  debug?: boolean;
  queue?: WireEvent[];
};

export type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type SavedStore = {
  read: () => Saved;
  write: (patch: Partial<Saved>, always?: boolean) => void;
  drop: (keys: (keyof Saved)[]) => void;
  refresh: () => void;
};

const key = "__ra";
const legacyPrefix = "__analytics_";

function parse<Value>(raw: string | null, fallback: Value): Value {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as Value;
  } catch {
    return fallback;
  }
}

function legacy(store: Store): Saved {
  function read(name: string) {
    return store.getItem(legacyPrefix + name);
  }
  const saved: Saved = {};
  const visitor = read("visitor_id");
  const userId = read("identity");
  const traits = parse<Props>(read("user_props"), {});
  const experiments = parse<Props>(read("experiments"), {});
  if (visitor) saved.visitor = visitor;
  if (userId) saved.userId = userId;
  if (read("opt_out") === "true") saved.optOut = true;
  if (Object.keys(traits).length > 0) saved.traits = traits;
  if (Object.keys(experiments).length > 0) saved.experiments = experiments;
  return saved;
}

/**
 * @name createSavedStore
 * @description Everything the SDK keeps across page loads, in one `__ra` JSON key. On the first
 * run it reads the 1.x keys (`__analytics_visitor_id`, `__analytics_opt_out`, the identity and
 * trait keys) so visitors keep their id, and moves them into `__ra` on the first write while
 * `allowed()` says so. Nothing is written while `allowed()` is false, which is how consent keeps
 * identity out of storage; a write with `always` records the visitor's own decision (`consent`,
 * `optOut` or `debug`) and writes only the fields it was given. Every write re-reads `__ra` first,
 * takes over the decisions another tab stored, and changes only its own fields, so a tab opened
 * before a revoke in another tab cannot overwrite it; `refresh` does the same for a `storage`
 * event. Without storage, or when storage throws, values live in memory for the page's lifetime.
 *
 * @example
 * const saved = createSavedStore(window.localStorage, () => true);
 * saved.write({ optOut: true }, true);
 */
export function createSavedStore(store: Store | null, allowed: () => boolean): SavedStore {
  function stored() {
    try {
      return store?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }
  const first = stored();
  let memory: Saved = first ? parse<Saved>(first, {}) : {};
  let unsaved: Saved = {};
  try {
    if (!first && store) memory = unsaved = legacy(store);
  } catch {
    noop();
  }

  function refresh() {
    const text = stored();
    if (!text) return;
    const { consent, optOut, debug } = parse<Saved>(text, {});
    memory = { ...memory, consent, optOut, debug };
  }

  function commit(patch: Partial<Saved>, gone: (keyof Saved)[], always = false) {
    refresh();
    memory = { ...memory, ...patch };
    unsaved = { ...unsaved, ...patch };
    for (const name of gone) {
      delete memory[name];
      delete unsaved[name];
    }
    const open = allowed();
    if (!always && !open) return;
    const next: Saved = { ...parse<Saved>(stored(), {}), ...(open ? unsaved : patch) };
    for (const name of gone) delete next[name];
    try {
      store?.setItem(key, JSON.stringify(next));
      if (!open) return;
      unsaved = {};
      for (const name of Object.keys(store ?? {})) {
        if (name.startsWith(legacyPrefix)) store?.removeItem(name);
      }
    } catch {
      noop();
    }
  }

  return {
    read: () => memory,
    write: (patch, always) => commit(patch, [], always),
    drop: (keys) => commit({}, keys),
    refresh,
  };
}
