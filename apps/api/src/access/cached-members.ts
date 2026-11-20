import type { MemberStore } from "@spoar/engine";

import { remember } from "./remember";

/**
 * @name cachedMembers
 * @description A `MemberStore` that remembers the allowlist and membership answers per instance
 * for `ttlMs`, so a signed-in request does not ask the database for them every time. A change
 * through this store clears what it remembers at once; a change made on another instance, or
 * straight in the database, applies when the entry expires. Failed reads are never remembered.
 *
 * @example
 * const members = cachedMembers(stores.members, () => clock.now(), 60_000);
 */
export function cachedMembers(members: MemberStore, clock: () => Date, ttlMs: number): MemberStore {
  const allowed = remember<Awaited<ReturnType<MemberStore["allowedLogin"]>>>(clock, ttlMs);
  const memberships = remember<Awaited<ReturnType<MemberStore["membership"]>>>(clock, ttlMs);
  function forget() {
    allowed.clear();
    memberships.clear();
  }
  return {
    ...members,
    allowedLogin: (login, githubId) =>
      allowed.read(
        `${login.toLowerCase()}\u0000${githubId ?? ""}`,
        () => members.allowedLogin(login, githubId),
        (result) => result.ok,
      ),
    membership: (userId) =>
      memberships.read(
        userId,
        () => members.membership(userId),
        (result) => result.ok,
      ),
    join: async (userId, login, githubId) => {
      forget();
      return members.join(userId, login, githubId);
    },
    allow: async (member) => {
      forget();
      return members.allow(member);
    },
    change: async (login, patch) => {
      forget();
      return members.change(login, patch);
    },
    remove: async (login) => {
      forget();
      return members.remove(login);
    },
  };
}
