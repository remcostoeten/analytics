import { expect, test } from "bun:test";

import type { MemberStore, Membership } from "@spoar/engine";
import { engineError } from "@spoar/engine";
import { err, ok } from "@spoar/shared/result";

import { cachedMembers } from "../src/access/cached-members";

const membership: Membership = {
  userId: "user_1",
  orgId: "org_1",
  role: "viewer",
  projectIds: null,
};

function counted(state: { allowed: boolean; fail: boolean }) {
  const calls = { allowedLogin: 0, membership: 0 };
  const store: MemberStore = {
    allowedLogin: async () => {
      calls.allowedLogin += 1;
      return state.fail ? err(engineError("UNAVAILABLE", "down")) : ok(state.allowed);
    },
    membership: async () => {
      calls.membership += 1;
      return ok(membership);
    },
    loginOf: async () => ok(null),
    join: async () => ok(membership),
    list: async () => ok([]),
    find: async () => ok(null),
    allow: async () => ok(true),
    change: async () => ok(null),
    remove: async () => ok(true),
  };
  return { store, calls };
}

test("answers are remembered until they expire", async () => {
  const clock = { now: 0 };
  const { store, calls } = counted({ allowed: true, fail: false });
  const members = cachedMembers(store, () => new Date(clock.now), 60_000);
  await members.allowedLogin("Octocat", null);
  await members.allowedLogin("octocat", null);
  await members.membership("user_1");
  await members.membership("user_1");
  expect(calls).toEqual({ allowedLogin: 1, membership: 1 });
  clock.now = 60_000;
  await members.allowedLogin("octocat", null);
  await members.membership("user_1");
  expect(calls).toEqual({ allowedLogin: 2, membership: 2 });
});

test("a change through the store forgets everything", async () => {
  const state = { allowed: true, fail: false };
  const { store, calls } = counted(state);
  const members = cachedMembers(store, () => new Date(0), 60_000);
  await members.allowedLogin("octocat", null);
  state.allowed = false;
  await members.remove("octocat");
  const after = await members.allowedLogin("octocat", null);
  expect(after).toEqual(ok(false));
  expect(calls.allowedLogin).toBe(2);
});

test("a failed read is asked again", async () => {
  const state = { allowed: true, fail: true };
  const { store, calls } = counted(state);
  const members = cachedMembers(store, () => new Date(0), 60_000);
  await members.allowedLogin("octocat", null);
  state.fail = false;
  expect(await members.allowedLogin("octocat", null)).toEqual(ok(true));
  expect(calls.allowedLogin).toBe(2);
});
