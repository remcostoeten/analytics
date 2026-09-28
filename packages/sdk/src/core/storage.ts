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
  for (const name of Object.keys(store)) {
    if (name.startsWith(legacyPrefix)) store.removeItem(name);
  }
  return saved;
}

/**
 * @name createSavedStore
 * @description Everything the SDK keeps across page loads, in one `__ra` JSON key. On the first
 * run it reads the 1.x keys (`__analytics_visitor_id`, `__analytics_opt_out`, the identity and
 * trait keys), carries them over so visitors keep their id, and removes them. Values are only
 * written while `allowed()` says so, which is how consent keeps identity out of storage; a write
 * with `always` records the consent or opt-out decision itself. Without storage, or when storage
 * throws, values live in memory for the page's lifetime.
 *
 * @example
 * const saved = createSavedStore(window.localStorage, () => true);
 * saved.write({ optOut: true });
 */
export function createSavedStore(store: Store | null, allowed: () => boolean): SavedStore {
  let memory: Saved = {};
  try {
    const raw = store?.getItem(key);
    memory = raw ? parse<Saved>(raw, {}) : store ? legacy(store) : {};
    if (!raw) store?.setItem(key, JSON.stringify(memory));
  } catch {
    noop();
  }

  function persist(always = false) {
    if (!always && !allowed()) return;
    try {
      store?.setItem(key, JSON.stringify(memory));
    } catch {
      noop();
    }
  }

  return {
    read: () => memory,
    write: (patch, always) => {
      memory = { ...memory, ...patch };
      persist(always);
    },
    drop: (keys) => {
      const next = { ...memory };
      for (const name of keys) delete next[name];
      memory = next;
      persist();
    },
  };
}
