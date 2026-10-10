import { describe, expect, test } from "bun:test";

import { isAdmin, startDebugtools } from "../src/loader/start";
import type { DebugtoolsOptions } from "../src/options";

function options(status: number, seen: string[] = []): DebugtoolsOptions {
  return {
    endpoint: "https://api.example.com/",
    project: "site",
    fetch: async (input) => {
      seen.push(String(input));
      return new Response("{}", { status });
    },
  };
}

async function settle() {
  for (let index = 0; index < 5; index++) await Promise.resolve();
}

describe("isAdmin", () => {
  test("asks the widget session route for the project", async () => {
    const seen: string[] = [];
    expect(await isAdmin(options(200, seen))).toBe(true);
    expect(seen).toEqual(["https://api.example.com/v2/widget/session?project=site"]);
  });

  test("is false for any other status", async () => {
    expect(await isAdmin(options(401))).toBe(false);
    expect(await isAdmin(options(403))).toBe(false);
  });

  test("is false when the request fails", async () => {
    const failing: DebugtoolsOptions = {
      endpoint: "https://api.example.com",
      project: "site",
      fetch: async () => {
        throw new TypeError("offline");
      },
    };
    expect(await isAdmin(failing)).toBe(false);
  });
});

describe("startDebugtools", () => {
  test("loads and mounts the console for an admin", async () => {
    const calls: string[] = [];
    startDebugtools(options(200), async () => () => {
      calls.push("mount");
      return () => calls.push("unmount");
    });
    await settle();
    expect(calls).toEqual(["mount"]);
  });

  test("loads nothing for a signed-out visitor", async () => {
    let loaded = false;
    startDebugtools(options(401), async () => {
      loaded = true;
      return () => () => undefined;
    });
    await settle();
    expect(loaded).toBe(false);
  });

  test("unmounts when stopped", async () => {
    const calls: string[] = [];
    const stop = startDebugtools(options(200), async () => () => () => calls.push("unmount"));
    await settle();
    stop();
    expect(calls).toEqual(["unmount"]);
  });
});
