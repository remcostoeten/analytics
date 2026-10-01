import { beforeAll, describe, expect, test } from "bun:test";

import { pgliteAccess } from "../src/adapters/pglite";
import { runMigrations } from "../src/db/migrate";
import { migrationsDirectory, readMigrations } from "../src/db/migration-files";
import { findDimension } from "../src/dimensions";
import type { Dimension } from "../src/define";
import type { Metric, ReadScope } from "../src/ports";
import { serverVisitor } from "../src/reads/server-visitor";
import { createClient, createDatabase } from "./pglite-client";

const database = createDatabase();
const { reads, details } = pgliteAccess(database);

type Seed = {
  id: string;
  visitor: string;
  session: string;
  ts: string;
  type?: string;
  name?: string;
  path?: string;
};

async function seed(event: Seed) {
  await database.query(
    `INSERT INTO events (project_id, type, name, ts, path, country, visitor_id, session_id, bot_score, bot_reasons, is_internal, fingerprint, meta)
     VALUES ('site', $1, $2, $3, $4, 'NL', $5, $6, 0, '{}', false, $7, '{}')`,
    [
      event.type ?? "pageview",
      event.name ?? event.type ?? "pageview",
      event.ts,
      event.path ?? "/",
      event.visitor,
      event.session,
      event.id,
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

const events: Metric = { kind: "built-in", name: "events" };
const visitors: Metric = { kind: "built-in", name: "visitors" };
const sessions: Metric = { kind: "built-in", name: "sessions" };

beforeAll(async () => {
  const report = await runMigrations(createClient(database), readMigrations(migrationsDirectory), {
    dryRun: false,
    baseline: null,
  });
  if (!report.ok) throw new Error(report.error.message);
  await database.query(
    `INSERT INTO visitors (project_id, fingerprint, first_seen, last_seen, meta) VALUES
      ('site', 'ada', '2026-09-21T10:00:00Z', '2026-09-21T10:01:00Z', '{"identity":{"userId":"u1"}}'),
      ('site', $1, '2026-09-21T09:00:00Z', '2026-09-24T09:00:00Z', '{"identity":{"userId":"u2"}}')`,
    [serverVisitor],
  );
  await seed({ id: "a1", visitor: "ada", session: "s1", ts: "2026-09-21T10:00:00Z", path: "/" });
  await seed({
    id: "a2",
    visitor: "ada",
    session: "s1",
    ts: "2026-09-21T10:01:00Z",
    path: "/pricing",
  });
  const server = { visitor: serverVisitor, session: serverVisitor };
  await seed({ ...server, id: "v1", ts: "2026-09-21T09:00:00Z", type: "event", name: "signup" });
  await seed({ ...server, id: "v2", ts: "2026-09-22T09:00:00Z", type: "event", name: "signup" });
  await seed({ ...server, id: "v3", ts: "2026-09-24T09:00:00Z", path: "/" });
});

describe("the shared server visitor", () => {
  test("counts as events and pageviews but never as a visitor or a session", async () => {
    expect(value(await reads.headline(week))).toEqual({
      visitors: 1,
      sessions: 1,
      pageviews: 3,
      pagesPerSession: 2,
      bounceRate: 0,
      sessionDurationMs: 60_000,
    });
  });

  test("keeps its events in breakdowns without counting it as a visitor", async () => {
    const result = value(
      await reads.breakdown(week, dimension("event"), [events, visitors, sessions], {
        limit: 10,
        offset: 0,
      }),
    );
    const signup = result.rows.find((row) => row.value === "signup");
    expect(signup?.metrics).toEqual([2, 0, 0]);
    expect(result.scopeVisitors).toBe(1);
  });

  test("stays out of retention, stickiness, lifecycle, paths and the map", async () => {
    const cohorts = value(await reads.retention(week, "week"));
    expect(cohorts.flatMap((cohort) => cohort.periods.map((period) => period.visitors))).toEqual([
      1,
    ]);
    expect(value(await reads.stickiness(week))).toEqual([{ days: 1, visitors: 1 }]);
    const lifecycle = value(await reads.lifecycle(week, "day"));
    expect(lifecycle.reduce((sum, period) => sum + period.new, 0)).toBe(1);
    const paths = value(await reads.paths(week, "/", "next"));
    expect(paths).toEqual({ views: 1, dropOff: 0, steps: [{ path: "/pricing", count: 1 }] });
    const places = value(await reads.places(week, "country", { limit: 10, offset: 0 }));
    expect(places.scopeVisitors).toBe(1);
    expect(places.rows.map((row) => row.visitors)).toEqual([1]);
  });

  test("is left out of the visitor, session and people lists", async () => {
    const page = { limit: 10, offset: 0 };
    const listed = value(await details.visitors(week, page));
    expect(listed.rows.map((row) => row.id)).toEqual(["ada"]);
    expect(listed.total).toBe(1);
    const listedSessions = value(await details.sessions(week, page));
    expect(listedSessions.rows.map((row) => row.id)).toEqual(["s1"]);
    const people = value(await details.people(["site"], page));
    expect(people.rows.map((row) => row.userId)).toEqual(["u1"]);
  });
});
