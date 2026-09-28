import { noop } from "@remcostoeten/analytics-shared/noop";

import type { SavedStore, Store } from "./storage";
import { uuidv7 } from "./uuid";

export type Identity = {
  visitor: () => string;
  session: () => string;
  reset: () => void;
};

type Session = { id: string; last: number };

const sessionKey = "__ra_session";
const legacySessionKey = "__analytics_session_id";
const idleMs = 30 * 60 * 1000;

function readSession(store: Store | null): Session | null {
  try {
    const raw = store?.getItem(sessionKey);
    if (raw) return JSON.parse(raw) as Session;
    const legacy = store?.getItem(legacySessionKey);
    return legacy ? { id: legacy, last: 0 } : null;
  } catch {
    return null;
  }
}

/**
 * @name createIdentity
 * @description The visitor id, kept in the saved store, and the session id, kept in
 * sessionStorage with a 30-minute sliding window: each call to `session()` extends it, and a
 * call after 30 idle minutes starts a new one. Nothing is written while `allowed()` is false.
 * No cookies.
 *
 * @example
 * const identity = createIdentity(saved, window.sessionStorage, Date.now, () => true);
 * identity.session();
 */
export function createIdentity(
  saved: SavedStore,
  store: Store | null,
  now: () => number,
  allowed: () => boolean,
): Identity {
  let current = readSession(store);

  function visitor() {
    const existing = saved.read().visitor;
    if (existing) return existing;
    const id = uuidv7(now());
    saved.write({ visitor: id });
    return id;
  }

  function session() {
    const time = now();
    const alive = current && (current.last === 0 || time - current.last < idleMs);
    current = { id: alive && current ? current.id : uuidv7(time), last: time };
    if (!allowed()) return current.id;
    try {
      store?.setItem(sessionKey, JSON.stringify(current));
      store?.removeItem(legacySessionKey);
    } catch {
      noop();
    }
    return current.id;
  }

  function reset() {
    saved.drop(["visitor"]);
    current = null;
    try {
      store?.removeItem(sessionKey);
    } catch {
      noop();
    }
  }

  return { visitor, session, reset };
}
