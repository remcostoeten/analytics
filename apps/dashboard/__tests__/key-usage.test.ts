import { describe, expect, test } from "bun:test";

import { describeKeyUsage } from "../src/modules/admin/key-usage";

const now = new Date("2026-10-24T12:00:00.000Z");

describe("describeKeyUsage", () => {
  test("a key that was never used", () => {
    expect(describeKeyUsage({ lastUsedAt: null, lastUsedOrigin: null }, now)).toBe("Not used yet");
  });

  test("minutes, hours and days", () => {
    const origin = "https://remcostoeten.nl";
    function at(iso: string) {
      return describeKeyUsage({ lastUsedAt: iso, lastUsedOrigin: origin }, now);
    }
    expect(at("2026-10-24T11:59:40.000Z")).toBe(`Last used just now from ${origin}`);
    expect(at("2026-10-24T11:55:00.000Z")).toBe(`Last used 5 minutes ago from ${origin}`);
    expect(at("2026-10-24T09:00:00.000Z")).toBe(`Last used 3 hours ago from ${origin}`);
    expect(at("2026-10-22T12:00:00.000Z")).toBe(`Last used 2 days ago from ${origin}`);
  });

  test("a call without an origin", () => {
    expect(
      describeKeyUsage({ lastUsedAt: "2026-10-24T11:00:00.000Z", lastUsedOrigin: null }, now),
    ).toBe("Last used 1 hour ago from a server without an origin");
  });
});
