import { noop } from "@spoar/shared/noop";

import type { SavedStore, Store } from "./storage";
import { uuidv7 } from "./uuid";

export type Identity = {
  visitor: () => string;
  session: () => string;
  reset: () => void;
};

type Session = { id: string; last: number };

const sessionKey = "__ra_session";
const idleMs = 30 * 60 * 1000;

function readSession(store: Store | null): Session | null {
  try {
    const raw = store?.getItem(sessionKey);
    return raw ? (JSON.parse(raw) as Session) : null;
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
    const fresh = uuidv7(now());
    saved.write({ visitor: fresh });
    return fresh;
  }

  function session() {
    const time = now();
    const alive = current && time - current.last < idleMs;
    current = { id: alive && current ? current.id : uuidv7(time), last: time };
    if (!allowed()) return current.id;
    try {
      store?.setItem(sessionKey, JSON.stringify(current));
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
