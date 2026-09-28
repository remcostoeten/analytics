import { afterEach, describe, expect, test } from "bun:test";

import { createAnalytics } from "../src/core/client";
import { mergeConfig, parseConfig, readEnv } from "../src/core/config";

afterEach(() => {
  delete process.env.NEXT_PUBLIC_RA_CONFIG;
});

describe("build config", () => {
  test.each([
    ["an object", '{"endpoint":"/_ra"}', { endpoint: "/_ra" }],
    ["unset", undefined, {}],
    ["not JSON", "{endpoint", {}],
    ["null", "null", {}],
  ])("parseConfig reads %s", (_, text, expected) => {
    expect(parseConfig(text)).toEqual(expected);
  });

  test("mergeConfig lets explicit options win but skips undefined ones", () => {
    const explicit: { endpoint?: string; release?: string } = {
      endpoint: "/events",
      release: undefined,
    };
    expect(mergeConfig({ endpoint: "/_ra", release: "1.0.0" }, explicit)).toEqual({
      endpoint: "/events",
      release: "1.0.0",
    });
  });

  test("readEnv gives undefined when the read throws", () => {
    expect(
      readEnv(() => {
        throw new ReferenceError("process is not defined");
      }),
    ).toBeUndefined();
  });

  test("the browser client reads NEXT_PUBLIC_RA_CONFIG under explicit options", async () => {
    process.env.NEXT_PUBLIC_RA_CONFIG = JSON.stringify({
      key: "pk_test",
      endpoint: "/from-env",
      release: "2026.09.28",
    });
    const fromEnv = createAnalytics({ pageviews: false, mode: "production" });
    const explicit = createAnalytics({ endpoint: "/_ra", pageviews: false, mode: "production" });
    expect(fromEnv.status().endpoint).toBe("/from-env");
    expect(explicit.status().endpoint).toBe("/_ra");
    await fromEnv.shutdown();
    await explicit.shutdown();
  });
});
