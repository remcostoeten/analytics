import { beforeAll, describe, expect, test } from "bun:test";

import { pgliteAccess } from "../src/adapters/pglite";
import { runMigrations } from "../src/db/migrate";
import { migrationsDirectory, readMigrations } from "../src/db/migration-files";
import { findDimension } from "../src/dimensions";
import type { Dimension } from "../src/define";
import type { Metric, ReadScope } from "../src/ports";
import { createClient, createDatabase } from "./pglite-client";

const database = createDatabase();
const { reads } = pgliteAccess(database);

type Seed = {
  id: string;
  visitor: string;
  session: string;
  ts: string;
  type?: string;
  name?: string;
  path?: string;
  country?: string;
  botScore?: number;
  botReasons?: string[];
  internal?: boolean;
  meta?: { [key: string]: string | number };
};

async function seed(event: Seed) {
  await database.query(
    `INSERT INTO events (project_id, type, name, ts, path, country, visitor_id, session_id, bot_score, bot_reasons, is_internal, fingerprint, meta)
     VALUES ('site', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      event.type ?? "pageview",
      event.name ?? event.type ?? "pageview",
      event.ts,
      event.path ?? "/",
      event.country ?? "NL",
      event.visitor,
      event.session,
      event.botScore ?? 0,
      event.botReasons ?? [],
      event.internal ?? false,
      event.id,
      JSON.stringify(event.meta ?? {}),
    ],
  );
}

function value<Value>(
  result: { ok: true; value: Value } | { ok: false; error: { message: string } },
) {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function dimension(name: string): Dimension {
  const found = findDimension(name);
  if (!found) throw new Error(`no dimension ${name}`);
  return found;
}

const week: ReadScope = {
  projectIds: ["site"],
  from: new Date("2026-09-20T00:00:00.000Z"),
  to: new Date("2026-09-27T00:00:00.000Z"),
  traffic: "human",
  filters: [],
};

const visitors: Metric = { kind: "built-in", name: "visitors" };
const pageviews: Metric = { kind: "built-in", name: "pageviews" };

beforeAll(async () => {
  const report = await runMigrations(createClient(database), readMigrations(migrationsDirectory), {
    dryRun: false,
    baseline: null,
  });
  if (!report.ok) throw new Error(report.error.message);
  await database.query(
    "INSERT INTO visitors (project_id, fingerprint, first_seen, meta) VALUES ('site', 'ada', '2026-09-01T00:00:00Z', '{\"identity\":{\"plan\":\"pro\"}}'), ('site', 'bo', '2026-09-21T09:00:00Z', null)",
  );
  await database.query(
    "INSERT INTO sessions (project_id, session_id, visitor_id, entry_path, exit_path) VALUES ('site', 's1', 'ada', '/', '/pricing'), ('site', 's2', 'bo', '/blog', '/blog'), ('site', 's3', 'ada', '/pricing', '/pricing')",
  );
  await seed({ id: "e1", visitor: "ada", session: "s1", ts: "2026-09-21T10:00:00Z", path: "/" });
  await seed({
    id: "e2",
    visitor: "ada",
    session: "s1",
    ts: "2026-09-21T10:01:00Z",
    path: "/pricing",
  });
  await seed({
    id: "e3",
    visitor: "ada",
    session: "s1",
    ts: "2026-09-21T10:02:00Z",
    type: "event",
    name: "checkout",
    path: "/pricing",
    meta: { eventName: "checkout", revenue: 49, plan: "pro" },
  });
  await seed({
    id: "e4",
    visitor: "bo",
    session: "s2",
    ts: "2026-09-22T09:00:00Z",
    path: "/blog",
    country: "DE",
  });
  await seed({
    id: "e5",
    visitor: "ada",
    session: "s3",
    ts: "2026-09-23T12:00:00Z",
    path: "/pricing",
  });
  await seed({
    id: "e6",
    visitor: "crawler",
    session: "s4",
    ts: "2026-09-23T12:00:00Z",
    path: "/",
    botScore: 100,
    botReasons: ["ua_crawler", "headers_missing"],
  });
  await seed({
    id: "e7",
    visitor: "me",
    session: "s5",
    ts: "2026-09-24T08:00:00Z",
    internal: true,
  });
  await seed({ id: "e8", visitor: "old", session: "s6", ts: "2026-09-15T08:00:00Z" });
});

describe("drizzleReads", () => {
  test("headline counts human traffic in the range only", async () => {
    expect(value(await reads.headline(week))).toEqual({
      visitors: 2,
      sessions: 3,
      pageviews: 4,
      pagesPerSession: 1.33,
      bounceRate: 0.667,
      sessionDurationMs: 40000,
    });
    expect(value(await reads.headline({ ...week, traffic: "bots" })).visitors).toBe(1);
    expect(value(await reads.headline({ ...week, traffic: "internal" })).visitors).toBe(1);
    expect(value(await reads.headline({ ...week, traffic: "all" })).visitors).toBe(4);
  });

  test("filters include, exclude and join sessions and visitors", async () => {
    const germany = { dimension: dimension("country"), value: "DE", exclude: false };
    expect(value(await reads.headline({ ...week, filters: [germany] })).visitors).toBe(1);
    expect(
      value(await reads.headline({ ...week, filters: [{ ...germany, exclude: true }] })).visitors,
    ).toBe(1);
    const pro = { dimension: dimension("trait:plan"), value: "pro", exclude: false };
    expect(value(await reads.headline({ ...week, filters: [pro] })).pageviews).toBe(3);
    const entry = { dimension: dimension("entry_page"), value: "/blog", exclude: false };
    expect(value(await reads.headline({ ...week, filters: [entry] })).sessions).toBe(1);
  });

  test("timeseries fills every day of the range, zeros included", async () => {
    const days = value(await reads.timeseries(week, visitors, "day"));
    expect(days.map((day) => [day.bucket.toISOString().slice(0, 10), day.value])).toEqual([
      ["2026-09-20", 0],
      ["2026-09-21", 1],
      ["2026-09-22", 1],
      ["2026-09-23", 1],
      ["2026-09-24", 0],
      ["2026-09-25", 0],
      ["2026-09-26", 0],
    ]);
  });

  test("breakdown orders by the first metric, pages through values and counts the total", async () => {
    const page = value(
      await reads.breakdown(week, dimension("page"), [visitors, pageviews], {
        limit: 1,
        offset: 0,
      }),
    );
    expect(page).toEqual({
      rows: [{ value: "/pricing", visitors: 1, metrics: [1, 2] }],
      total: 3,
      scopeVisitors: 2,
    });
    const next = value(
      await reads.breakdown(week, dimension("page"), [visitors, pageviews], {
        limit: 5,
        offset: 1,
      }),
    );
    expect(next.rows.map((row) => row.value)).toEqual(["/", "/blog"]);
  });

  test("breakdowns by props, events, bot reasons and visitor type", async () => {
    const revenue: Metric = { kind: "sum", name: "sum:prop.revenue", key: "revenue" };
    const byPlan = value(
      await reads.breakdown(week, dimension("prop:plan"), [revenue], { limit: 10, offset: 0 }),
    );
    expect(byPlan.rows).toEqual([{ value: "pro", visitors: 1, metrics: [49] }]);
    const byEvent = value(
      await reads.breakdown(week, dimension("event"), [{ kind: "built-in", name: "events" }], {
        limit: 10,
        offset: 0,
      }),
    );
    expect(byEvent.rows.map((row) => [row.value, row.metrics[0]])).toEqual([
      ["checkout", 1],
      ["pageview", 0],
    ]);
    const reasons = value(
      await reads.breakdown({ ...week, traffic: "bots" }, dimension("bot_reason"), [visitors], {
        limit: 10,
        offset: 0,
      }),
    );
    expect(reasons.rows.map((row) => row.value).sort()).toEqual(["headers_missing", "ua_crawler"]);
    const types = value(
      await reads.breakdown(week, dimension("visitor_type"), [visitors], { limit: 10, offset: 0 }),
    );
    expect(types.rows.map((row) => [row.value, row.visitors])).toEqual([
      ["new", 1],
      ["returning", 1],
    ]);
  });

  test("time on page is the gap to the next pageview in the session", async () => {
    const stay = value(
      await reads.breakdown(week, dimension("page"), [{ kind: "built-in", name: "time_on_page" }], {
        limit: 10,
        offset: 0,
      }),
    );
    expect(stay.rows.find((row) => row.value === "/")?.metrics).toEqual([60000]);
  });

  test("realtime covers the window with top pages and countries", async () => {
    const live = value(
      await reads.realtime(
        ["site"],
        new Date("2026-09-21T09:58:00Z"),
        new Date("2026-09-21T10:03:00Z"),
      ),
    );
    expect(live).toEqual({
      visitors: 1,
      pageviews: 2,
      pages: [
        { value: "/", visitors: 1 },
        { value: "/pricing", visitors: 1 },
      ],
      countries: [{ value: "NL", visitors: 1 }],
    });
  });
});
