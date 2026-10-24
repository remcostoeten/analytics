import { describe, expect, test } from "bun:test";

import { describeKeyUse, describeToken, fetchKeyUsage } from "../src/widget/status";

const now = new Date("2026-10-24T12:00:00.000Z");
const use = { lastUsedAt: "2026-10-24T11:55:00.000Z", lastUsedOrigin: "https://site.nl" };
const unused = { lastUsedAt: null, lastUsedOrigin: null };

describe("describeKeyUse", () => {
  test("says when and from where, or that it is unused", () => {
    expect(describeKeyUse("Public", use, now)).toBe(
      "Public key used 5 min ago from https://site.nl",
    );
    expect(describeKeyUse("Secret", unused, now)).toBe("Secret key not used yet");
    expect(describeKeyUse("Secret", { ...use, lastUsedOrigin: null }, now)).toBe(
      "Secret key used 5 min ago from a server",
    );
  });
});

describe("describeToken", () => {
  test("live until a time, then expired", () => {
    expect(describeToken("2026-10-24T12:15:00.000Z", now)).toStartWith("Token live until");
    expect(describeToken("2026-10-24T11:59:00.000Z", now)).toBe("Token expired");
  });
});

describe("fetchKeyUsage", () => {
  const options = { endpoint: "https://api.test/", project: "site", token: "wt_1" };

  test("reads keyUsage with the widget token", async () => {
    const seen: [string, string | undefined][] = [];
    const usage = await fetchKeyUsage({
      ...options,
      fetch: async (input, init) => {
        seen.push([String(input), new Headers(init?.headers).get("authorization") ?? undefined]);
        return new Response(JSON.stringify({ data: { public: use, secret: unused } }));
      },
    });
    expect(usage).toEqual({ public: use, secret: unused });
    expect(seen).toEqual([["https://api.test/v2/projects/site/key-usage", "Bearer wt_1"]]);
  });

  test("gives null for a body without usage, an error or a network failure", async () => {
    async function publicShape() {
      return new Response(JSON.stringify({ data: { id: "site" } }));
    }
    async function refused() {
      return new Response("{}", { status: 403 });
    }
    async function down(): Promise<Response> {
      throw new Error("offline");
    }
    expect(await fetchKeyUsage({ ...options, fetch: publicShape })).toBeNull();
    expect(await fetchKeyUsage({ ...options, fetch: refused })).toBeNull();
    expect(await fetchKeyUsage({ ...options, fetch: down })).toBeNull();
  });
});
