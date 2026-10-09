import { describe, expect, test } from "bun:test";
import type { LiveEvent } from "@spoar/contract";

import { mergeEvents, needsSignIn } from "../src/modules/analytics/realtime";

function event(id: string, ts: string): LiveEvent {
  return { id, project: "site", name: "pageview", ts, path: "/", country: "NL", device: "desktop" };
}

describe("mergeEvents", () => {
  test("adds unseen events newest first and keeps the limit", () => {
    const shown = [event("b", "2026-10-09T10:00:02Z"), event("a", "2026-10-09T10:00:01Z")];
    const polled = [event("c", "2026-10-09T10:00:03Z"), event("b", "2026-10-09T10:00:02Z")];
    expect(mergeEvents(shown, polled, 2).map((entry) => entry.id)).toEqual(["c", "b"]);
  });

  test("returns the same list when nothing is new", () => {
    const shown = [event("a", "2026-10-09T10:00:01Z")];
    expect(mergeEvents(shown, shown, 10)).toBe(shown);
  });
});

describe("needsSignIn", () => {
  test("is true for access errors only", () => {
    const error = { message: "", status: 401, details: null, requestId: null };
    expect(needsSignIn({ ok: false, error: { ...error, code: "UNAUTHORIZED" } })).toBe(true);
    expect(needsSignIn({ ok: false, error: { ...error, code: "FORBIDDEN" } })).toBe(true);
    expect(needsSignIn({ ok: false, error: { ...error, code: "NETWORK" } })).toBe(false);
    expect(needsSignIn({ ok: true, value: 1 })).toBe(false);
  });
});
