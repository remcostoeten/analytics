import { beforeAll, describe, expect, test } from "bun:test";

import { PGlite } from "@electric-sql/pglite";

import { fixedClock, memoryGeo, memoryHasher, memoryLogger } from "../src/adapters/memory";
import { pgliteAdapters } from "../src/adapters/pglite";
import { defineSignal } from "../src/define";
import { runMigrations } from "../src/db/migrate";
import { migrationsDirectory, readMigrations } from "../src/db/migration-files";
import { createEngine } from "../src/pipeline";
import { botScoreStage } from "../src/stages/bot-score";
import { enrichStage } from "../src/stages/enrich";
import { browserBatch, now } from "./batch";
import { createClient } from "./pglite-client";

type Row = {
  name: string;
  type: string;
  fingerprint: string;
  schema_version: number;
  bot_score: number;
  bot_reasons: string[];
  meta: { [key: string]: string };
  ts: Date;
};

const database = new PGlite();
const clock = fixedClock(now);
const { store, limiter } = pgliteAdapters(database, clock);
const signup = defineSignal({
  name: "client_no_input",
  weight: 60,
  detect: (draft) => draft.event.name === "signup",
});
const engine = createEngine(
  {
    store,
    limiter,
    geo: memoryGeo(new Map()),
    hasher: memoryHasher(),
    clock,
    logger: memoryLogger(),
  },
  { stages: [enrichStage, botScoreStage], signals: [signup], enrichers: [], dimensions: [] },
);

beforeAll(async () => {
  const report = await runMigrations(createClient(database), readMigrations(migrationsDirectory), {
    dryRun: false,
    baseline: null,
  });
  if (!report.ok) throw new Error(report.error.message);
});

describe("engine on PGlite", () => {
  test("stores a batch with the v2 and legacy columns, then dedupes a retry", async () => {
    expect(await engine.ingest(browserBatch())).toEqual({
      ok: true,
      value: { accepted: 2, duplicates: 0, rejected: [] },
    });
    expect(await engine.ingest(browserBatch())).toEqual({
      ok: true,
      value: { accepted: 0, duplicates: 2, rejected: [] },
    });

    const result = await database.query<Row>(
      "SELECT name, type, fingerprint, schema_version, bot_score, bot_reasons, meta, ts FROM events ORDER BY ts",
    );
    expect(result.rows.map(({ ts, ...row }) => ({ ...row, ts: ts.toISOString() }))).toEqual([
      {
        name: "pageview",
        type: "pageview",
        fingerprint: "01928c3e-7a4b-7c1d-9f00-2b7c1e5d8a11",
        schema_version: 1,
        bot_score: 0,
        bot_reasons: [],
        meta: {},
        ts: "2026-09-27T16:39:58.912Z",
      },
      {
        name: "signup",
        type: "event",
        fingerprint: "01928c3e-7a4c-7a02-8b11-3c8d2f6e9b22",
        schema_version: 1,
        bot_score: 60,
        bot_reasons: ["client_no_input"],
        meta: { plan: "pro", eventName: "signup" },
        ts: "2026-09-27T16:40:00.401Z",
      },
    ]);
  });

  test("counts rate limit hits in the database", async () => {
    const decisions = [];
    for (let hit = 0; hit < 3; hit += 1) decisions.push(await limiter.hit("ingest:abc", 2, 60));
    expect(decisions.map((decision) => [decision.allowed, decision.hits])).toEqual([
      [true, 1],
      [true, 2],
      [false, 3],
    ]);
    expect(decisions[2]?.retryAfterSeconds).toBe(60);
  });
});
