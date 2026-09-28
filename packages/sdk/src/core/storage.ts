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
const legacyKeys = [
  "visitor_id",
  "opt_out",
  "identity",
  "user_props",
  "experiments",
  "queue__",
  "session_id",
  "session_timeout",
];

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
  for (const name of legacyKeys) store.removeItem(legacyPrefix + name);
  return saved;
}

function safely<Value>(run: () => Value, fallback: Value): Value {
  try {
    return run();
  } catch {
    return fallback;
  }
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
  let memory: Saved = safely(() => {
    if (!store) return {};
    const raw = store.getItem(key);
    if (raw) return parse<Saved>(raw, {});
    const migrated = legacy(store);
    store.setItem(key, JSON.stringify(migrated));
    return migrated;
  }, {});

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
