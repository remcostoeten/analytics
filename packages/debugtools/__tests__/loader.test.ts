import { describe, expect, test } from "bun:test";

import { requestGrant, startDebugtools } from "../src/loader/start";
import type { DebugtoolsOptions } from "../src/options";

const session = { project: "site", token: "wt_abc", expiresAt: "2026-10-11T12:15:00.000Z" };

function options(status: number, seen: string[] = []): DebugtoolsOptions {
  return {
    endpoint: "https://api.example.com/",
    project: "site",
    fetch: async (input) => {
      seen.push(String(input));
      return new Response(JSON.stringify(session), { status });
    },
  };
}

async function settle() {
  for (let index = 0; index < 5; index++) await Promise.resolve();
}

describe("requestGrant", () => {
  test("asks the widget session route for the project and answers its token", async () => {
    const seen: string[] = [];
    expect(await requestGrant(options(200, seen))).toEqual(session);
    expect(seen).toEqual(["https://api.example.com/v2/widget/session?project=site"]);
  });

  test("is null for any other status", async () => {
    expect(await requestGrant(options(401))).toBeNull();
    expect(await requestGrant(options(403))).toBeNull();
  });

  test("is null when the request fails", async () => {
    const failing: DebugtoolsOptions = {
      endpoint: "https://api.example.com",
      project: "site",
      fetch: async () => {
        throw new TypeError("offline");
      },
    };
    expect(await requestGrant(failing)).toBeNull();
  });
});

describe("startDebugtools", () => {
  test("loads and mounts the console with the grant for an admin", async () => {
    const calls: string[] = [];
    startDebugtools(options(200), async () => (_, grant) => {
      calls.push(`mount ${grant?.token}`);
      return () => calls.push("unmount");
    });
    await settle();
    expect(calls).toEqual(["mount wt_abc"]);
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

  test("mounts the demo console without a grant for a signed-out visitor", async () => {
    const calls: string[] = [];
    startDebugtools({ ...options(401), demo: true }, async () => (_, grant) => {
      calls.push(`mount ${grant === null}`);
      return () => undefined;
    });
    await settle();
    expect(calls).toEqual(["mount true"]);
  });

  test("mounts without a widget check for the session auth", async () => {
    const seen: string[] = [];
    const calls: string[] = [];
    startDebugtools({ ...options(401, seen), auth: "session" }, async () => (_, grant) => {
      calls.push(`mount ${grant === null}`);
      return () => undefined;
    });
    await settle();
    expect(calls).toEqual(["mount true"]);
    expect(seen).toEqual([]);
  });

  test("unmounts when stopped", async () => {
    const calls: string[] = [];
    const stop = startDebugtools(options(200), async () => () => () => calls.push("unmount"));
    await settle();
    stop();
    expect(calls).toEqual(["unmount"]);
  });
});
