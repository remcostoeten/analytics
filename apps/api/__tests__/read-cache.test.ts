import { describe, expect, test } from "bun:test";

import type { ProjectAdmin, ProjectRecord, TokenStore } from "@spoar/engine";
import { engineError } from "@spoar/engine";
import { memoryHasher, memoryLimiter } from "@spoar/engine/adapters/memory";
import { err, ok } from "@spoar/shared/result";
import type { Nullable } from "@spoar/shared/semantic";

import { cachedProjects } from "../src/access/cached-projects";
import { throttledTokens } from "../src/access/throttled-tokens";
import type { Caller } from "../src/access/types";
import { readGate } from "../src/modules/reads/guard";
import type { Cache, ReadMemo, Set } from "../src/modules/reads/guard";

const docsBase = "https://api.example.test/v2/openapi";
const anonymous: Caller = { kind: "anonymous" };

const site: ProjectRecord = {
  id: "site",
  name: "Site",
  domain: "site.test",
  visibility: "public",
  publicVisitorData: false,
  sqlEnabled: false,
  widgetReports: false,
  debugConsole: false,
  replayEnabled: false,
  llmEnabled: false,
  allowedOrigins: [],
  retentionDays: 365,
  retentionEnabled: false,
  publicKey: "pk_site",
  publicKeyUsedAt: null,
  publicKeyUsedOrigin: null,
  secretKeyUsedAt: null,
  secretKeyUsedOrigin: null,
  orgId: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

function countedProjects(state: { fail: boolean }) {
  const calls = { find: 0, list: 0 };
  const store: ProjectAdmin = {
    find: async () => {
      calls.find += 1;
      return state.fail ? err(engineError("UNAVAILABLE", "down")) : ok(site);
    },
    list: async () => {
      calls.list += 1;
      return ok([site]);
    },
    create: async () => ok(site),
    update: async () => ok(site),
    rotate: async () => ok(new Date(0)),
    keyState: async () => ok(null),
    secretMatches: async () => ok(false),
    recordKeyCheck: async () => ok(true),
    remove: async () => ok(true),
  };
  return { store, calls };
}

describe("cachedProjects", () => {
  test("remembers find and list until they expire", async () => {
    const clock = { now: 0 };
    const { store, calls } = countedProjects({ fail: false });
    const projects = cachedProjects(store, () => new Date(clock.now), 60_000);
    await projects.find("site");
    await projects.find("site");
    await projects.list(null);
    await projects.list(null);
    expect(calls).toEqual({ find: 1, list: 1 });
    clock.now = 60_000;
    await projects.find("site");
    expect(calls.find).toBe(2);
  });

  test("a change through the store forgets everything", async () => {
    const { store, calls } = countedProjects({ fail: false });
    const projects = cachedProjects(store, () => new Date(0), 60_000);
    await projects.find("site");
    await projects.update("site", { visibility: "private" });
    await projects.find("site");
    expect(calls.find).toBe(2);
  });

  test("a failed read is asked again", async () => {
    const state = { fail: true };
    const { store, calls } = countedProjects(state);
    const projects = cachedProjects(store, () => new Date(0), 60_000);
    await projects.find("site");
    state.fail = false;
    expect(await projects.find("site")).toEqual(ok(site));
    expect(calls.find).toBe(2);
  });
});

describe("throttledTokens", () => {
  test("writes lastUsedAt at most once per interval per token", async () => {
    const touched: string[] = [];
    const store: TokenStore = {
      byHash: async () => ok(null),
      list: async () => ok([]),
      create: async () => err(engineError("UNAVAILABLE", "unused")),
      revoke: async () => ok(true),
      touch: async (id) => {
        touched.push(id);
        return ok(undefined);
      },
    };
    const tokens = throttledTokens(store, 60_000);
    await tokens.touch("tok_1", new Date(0));
    await tokens.touch("tok_1", new Date(30_000));
    await tokens.touch("tok_2", new Date(30_000));
    await tokens.touch("tok_1", new Date(60_000));
    expect(touched).toEqual(["tok_1", "tok_2", "tok_1"]);
  });
});

describe("readGate memo", () => {
  const memo: ReadMemo = { aggregateMs: 60_000, liveMs: 15_000 };

  function gate(kept: Nullable<ReadMemo>) {
    const clock = { now: 0 };
    const options = {
      limiter: memoryLimiter({ now: () => new Date(clock.now) }),
      hasher: memoryHasher(),
      ipSecret: "secret",
      publicLimit: 1000,
      clock: () => new Date(clock.now),
      memo: kept ?? undefined,
    };
    return { gate: readGate(options, docsBase), clock };
  }

  async function ask(
    reads: ReturnType<typeof readGate>,
    path: string,
    cache: Cache,
    project: ProjectRecord = site,
  ) {
    const set: Set = { headers: {} };
    const runs = { count: 0 };
    const body = await reads.answer(
      new Request(`https://api.example.test${path}`),
      anonymous,
      project,
      set,
      cache,
      async () => {
        runs.count += 1;
        return ok({ path });
      },
    );
    return { body, runs: runs.count, cacheControl: set.headers["cache-control"] };
  }

  test("repeats of an aggregate read are answered from memory, in any parameter order", async () => {
    const { gate: reads, clock } = gate(memo);
    expect(
      (await ask(reads, "/v2/projects/site/stats?period=7d&traffic=human", "aggregate")).runs,
    ).toBe(1);
    expect(
      (await ask(reads, "/v2/projects/site/stats?traffic=human&period=7d", "aggregate")).runs,
    ).toBe(0);
    expect((await ask(reads, "/v2/projects/site/stats?period=30d", "aggregate")).runs).toBe(1);
    clock.now = 60_000;
    expect(
      (await ask(reads, "/v2/projects/site/stats?period=7d&traffic=human", "aggregate")).runs,
    ).toBe(1);
  });

  test("live reads expire sooner and private reads are never kept", async () => {
    const { gate: reads, clock } = gate(memo);
    await ask(reads, "/v2/projects/site/realtime", "live");
    clock.now = 14_000;
    expect((await ask(reads, "/v2/projects/site/realtime", "live")).runs).toBe(0);
    clock.now = 15_000;
    expect((await ask(reads, "/v2/projects/site/realtime", "live")).runs).toBe(1);
    await ask(reads, "/v2/projects/site/realtime/events", "private");
    expect((await ask(reads, "/v2/projects/site/realtime/events", "private")).runs).toBe(1);
  });

  test("downloads and gates without a memo always run", async () => {
    const { gate: reads } = gate(memo);
    await ask(reads, "/v2/projects/site/breakdown/page?format=csv", "aggregate");
    expect(
      (await ask(reads, "/v2/projects/site/breakdown/page?format=csv", "aggregate")).runs,
    ).toBe(1);
    const { gate: plain } = gate(null);
    await ask(plain, "/v2/projects/site/stats", "aggregate");
    expect((await ask(plain, "/v2/projects/site/stats", "aggregate")).runs).toBe(1);
  });

  test("cache headers follow the kind of read and the project's visibility", async () => {
    const { gate: reads } = gate(null);
    const closed = { ...site, visibility: "private" as const };
    expect((await ask(reads, "/a", "aggregate")).cacheControl).toBe("public, s-maxage=60");
    expect((await ask(reads, "/a", "aggregate", closed)).cacheControl).toBe("private, max-age=60");
    expect((await ask(reads, "/a", "live", closed)).cacheControl).toBe("private, max-age=15");
    expect((await ask(reads, "/a", "live-private")).cacheControl).toBe("private, no-store");
    expect((await ask(reads, "/a", "private")).cacheControl).toBe("private, no-store");
  });
});
