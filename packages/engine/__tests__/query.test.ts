import { beforeAll, describe, expect, test } from "bun:test";

import { pgliteAccess, pgliteTransact } from "../src/adapters/pglite";
import { webCryptoHasher } from "../src/adapters/system";
import { runMigrations } from "../src/db/migrate";
import { migrationsDirectory, readMigrations } from "../src/db/migration-files";
import { prepareQuery } from "../src/query/guard";
import type { QueryParams } from "../src/query/guard";
import { queryRunner } from "../src/query/runner";
import { queryViews } from "../src/query/views";
import { createClient, createDatabase } from "./pglite-client";

const database = createDatabase();
const access = pgliteAccess(database);
const range: QueryParams = { from: "2026-09-01T00:00:00Z", to: "2026-09-28T00:00:00Z" };

function prepared(sql: string, params: QueryParams = range) {
  const result = prepareQuery(sql, params);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

async function rows(sql: string, projects: string[] = ["site"], params: QueryParams = range) {
  const result = await access.queries.run(prepared(sql, params), projects);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

async function event(values: {
  id: string;
  project?: string;
  name: string;
  visitor: string;
  session: string;
  ts: string;
  path: string;
  route?: string;
  meta?: object;
  bot?: number;
}) {
  await database.query(
    `INSERT INTO events (project_id, type, name, ts, path, route, host, visitor_id, session_id, fingerprint, device_type, bot_score, meta)
     VALUES ($1, $2, $3, $4, $5, $6, 'site.test', $7, $8, $9, 'mobile', $10, $11)`,
    [
      values.project ?? "site",
      values.name === "pageview" ? "pageview" : "custom",
      values.name,
      values.ts,
      values.path,
      values.route ?? values.path,
      values.visitor,
      values.session,
      values.id,
      values.bot ?? 0,
      JSON.stringify(values.meta ?? {}),
    ],
  );
}

beforeAll(async () => {
  const report = await runMigrations(createClient(database), readMigrations(migrationsDirectory), {
    dryRun: false,
    baseline: null,
  });
  if (!report.ok) throw new Error(report.error.message);
  await database.exec(`
    INSERT INTO sessions (project_id, session_id, visitor_id, started_at, last_event_at, pageviews, events, duration_ms, is_bounce, referrer, channel) VALUES
      ('site', 's1', 'v1', '2026-09-10T10:00:00Z', '2026-09-10T10:02:00Z', 2, 0, 120000, false, 'https://www.google.com/search', 'search'),
      ('site', 's2', 'v1', '2026-09-12T10:00:00Z', '2026-09-12T10:05:00Z', 2, 1, 300000, false, NULL, 'direct'),
      ('other', 's3', 'v3', '2026-09-12T10:00:00Z', '2026-09-12T10:00:00Z', 1, 0, 0, true, NULL, 'direct');
    INSERT INTO visitors (project_id, fingerprint, first_seen, last_seen, meta) VALUES
      ('site', 'v1', '2026-09-10T10:00:00Z', '2026-09-12T10:05:00Z', '{"identity":{"userId":"user_1","plan":"pro"}}'),
      ('other', 'v3', '2026-09-12T10:00:00Z', '2026-09-12T10:00:00Z', '{"identity":{"userId":"user_1","plan":"free"}}');
    INSERT INTO web_vitals (id, project_id, session_id, ts, metric, value, rating, route, path, device) VALUES
      ${Array.from({ length: 20 }, (_, index) => `('w${index}', 'site', 's1', '2026-09-10T10:00:00Z', 'lcp', ${1000 + index * 100}, 'good', '/pricing', '/pricing', 'mobile')`).join(",\n      ")};
  `);
  await event({
    id: "e1",
    name: "pageview",
    visitor: "v1",
    session: "s1",
    ts: "2026-09-10T10:00:00Z",
    path: "/",
  });
  await event({
    id: "e2",
    name: "pageview",
    visitor: "v1",
    session: "s1",
    ts: "2026-09-10T10:01:00Z",
    path: "/pricing",
  });
  await event({
    id: "e3",
    name: "scroll_depth",
    visitor: "v1",
    session: "s1",
    ts: "2026-09-10T10:01:30Z",
    path: "/pricing",
    meta: { depth: 80 },
  });
  await event({
    id: "e4",
    name: "pageview",
    visitor: "v1",
    session: "s2",
    ts: "2026-09-12T10:00:00Z",
    path: "/",
  });
  await event({
    id: "e5",
    name: "pageview",
    visitor: "v1",
    session: "s2",
    ts: "2026-09-12T10:04:00Z",
    path: "/pricing",
  });
  await event({
    id: "e6",
    name: "signup",
    visitor: "v1",
    session: "s2",
    ts: "2026-09-12T10:05:00Z",
    path: "/pricing",
    meta: { plan: "pro", revenue: 49, utmCampaign: "launch" },
  });
  await event({
    id: "e7",
    name: "checkout",
    visitor: "v1",
    session: "s2",
    ts: "2026-09-12T10:05:30Z",
    path: "/pricing",
    meta: { revenue: 49, utmCampaign: "launch" },
  });
  await event({
    id: "b1",
    name: "pageview",
    visitor: "bot",
    session: "sb",
    ts: "2026-09-12T10:00:00Z",
    path: "/",
    bot: 90,
  });
  await event({
    id: "o1",
    project: "other",
    name: "pageview",
    visitor: "v3",
    session: "s3",
    ts: "2026-09-12T10:00:00Z",
    path: "/",
  });
});

describe("prepareQuery", () => {
  test("binds :from, :to and :project, leaving casts, strings and comments alone", () => {
    expect(
      prepareQuery(
        "select ts::date, ':to' as x -- :from\nfrom events where ts >= :from and ts < :to and ts > :from and project_id = :project;",
        { ...range, project: "site" },
      ),
    ).toEqual({
      ok: true,
      value: {
        text: "select ts::date, ':to' as x -- :from\nfrom events where ts >= $1::timestamptz and ts < $2::timestamptz and ts > $1::timestamptz and project_id = $3::text",
        params: ["2026-09-01T00:00:00Z", "2026-09-28T00:00:00Z", "site"],
      },
    });
  });

  test.each([
    ["delete from events", "Only SELECT and WITH queries can run"],
    ["select 1; select 2", "Send one statement at a time"],
    ["with x as (delete from events returning *) select * from x", "DELETE is not allowed"],
    ["select * into copy_of from events", "INTO is not allowed"],
    ["select pg_sleep(20)", "pg_sleep is not allowed"],
    ["select \"PG_READ_FILE\"('x')", "PG_READ_FILE is not allowed"],
    ["select set_config('app.project_ids', '{other}', true)", "set_config is not allowed"],
    ["select query_to_xml('select 1', true, true, '')", "query_to_xml is not allowed"],
    ["select * from pg_catalog.pg_roles", "pg_catalog is not allowed"],
    ["select $1", "Use :from, :to and :project instead of positional parameters"],
    ["select :since", "Unknown parameter :since; use :from, :to or :project"],
    ["select 'open", "The query has an unclosed string"],
    ["   ", "The query is empty"],
  ])("rejects %s", (sql, message) => {
    const result = prepareQuery(sql, {});
    expect(result.ok ? null : result.error.message).toBe(message);
  });

  test("needs a value for every parameter used", () => {
    const result = prepareQuery("select :project", {});
    expect(result.ok ? null : result.error.message).toBe(
      ":project is used but params.project is missing",
    );
  });
});

describe("the query views", () => {
  test("match the catalog /v2/query/schema serves", async () => {
    const result = await database.query<{ table_name: string; column_name: string }>(
      "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'query' ORDER BY table_name, ordinal_position",
    );
    const migrated = new Map<string, string[]>();
    for (const row of result.rows) {
      migrated.set(row.table_name, [...(migrated.get(row.table_name) ?? []), row.column_name]);
    }
    expect([...migrated.keys()].sort()).toEqual(queryViews.map((view) => view.name).sort());
    for (const view of queryViews) {
      expect(migrated.get(view.name)).toEqual(view.columns.map((column) => column.name));
    }
  });
});

describe("queryRunner", () => {
  test("only returns rows of the projects it is given", async () => {
    const site = await rows("select project_id, count(*) as n from events group by 1 order by 1");
    expect(site.rows).toEqual([["site", 8]]);
    const both = await rows("select project_id, count(*) as n from events group by 1 order by 1", [
      "site",
      "other",
    ]);
    expect(both.rows).toEqual([
      ["other", 1],
      ["site", 8],
    ]);
    const none = await rows("select count(*) as n from events", []);
    expect(none.rows).toEqual([[0]]);
  });

  test("cannot read the tables under the views or widen its own scope", async () => {
    const raw = await access.queries.run(prepared("select * from public.events"), ["site"]);
    expect(raw.ok ? null : raw.error).toMatchObject({ code: "VALIDATION_FAILED" });
    const secret = await access.queries.run(prepared("select * from public.query_secret"), [
      "site",
    ]);
    expect(secret.ok ? null : secret.error.message).toStartWith(
      "Only the views in /v2/query/schema",
    );
    const forged = await database.transaction(async (tx) => {
      await tx.query("SET LOCAL ROLE analytics_reader");
      await tx.query("SELECT set_config('app.project_ids', '{site,other}', true)");
      return (await tx.query("SELECT count(*)::int AS n FROM query.events")).rows;
    });
    expect(forged).toEqual([{ n: 0 }]);
  });

  test("runs read-only, whatever gets past the parser", async () => {
    const transact = pgliteTransact(database);
    const error = await transact([
      { text: "INSERT INTO rate_limits (key, window_start) VALUES ('x', now())", params: [] },
    ]).then(
      () => null,
      (failure: unknown) => String(failure),
    );
    expect(error).toContain("read-only transaction");
  });

  test("stops at the row limit and says so", async () => {
    const small = queryRunner(
      pgliteTransact(database),
      async () => {
        const result = await database.query<{ secret: string }>("SELECT secret FROM query_secret");
        return result.rows[0]?.secret ?? "";
      },
      webCryptoHasher(),
      { timeoutMs: 10_000, maxRows: 3 },
    );
    const result = await small.run(prepared("select event_id from events order by event_id"), [
      "site",
    ]);
    expect(result).toEqual({
      ok: true,
      value: { columns: ["event_id"], rows: [["b1"], ["e1"], ["e2"]], truncated: true },
    });
  });

  test("an error in the query is a validation error with Postgres' message", async () => {
    const result = await access.queries.run(prepared("select nope from events"), ["site"]);
    expect(result.ok ? null : result.error).toMatchObject({
      code: "VALIDATION_FAILED",
      message: 'column "nope" does not exist',
    });
  });

  test("explain returns the planner's estimate", async () => {
    const result = await access.queries.explain(
      prepared("select count(*) from events where ts between :from and :to"),
      ["site"],
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.totalCost).toBeGreaterThan(0);
      expect(result.value.estimatedRows).toBe(1);
    }
  });
});

describe("the SQL reference examples", () => {
  test("top routes by average time on page", async () => {
    const result =
      await rows(`select route, count(*) as views, round(avg(time_on_page_ms) / 1000.0, 1) as avg_seconds
      from pageviews where is_human and ts between :from and :to
      group by route order by views desc, route limit 20`);
    expect(result.columns).toEqual(["route", "views", "avg_seconds"]);
    expect(result.rows).toEqual([
      ["/", 2, "150.0"],
      ["/pricing", 2, null],
    ]);
  });

  test("how many visits it takes people to sign up", async () => {
    const result = await rows(`select s.visit_number, count(*) as signups
      from events e join sessions s using (session_id)
      where e.name = 'signup' and e.is_human and e.ts between :from and :to
      group by s.visit_number order by s.visit_number`);
    expect(result.rows).toEqual([[2, 1]]);
  });

  test("pricing to signup as a two-step funnel", async () => {
    const result = await rows(`with saw_pricing as (
        select distinct session_id from pageviews
        where route = '/pricing' and is_human and ts between :from and :to
      ),
      signed_up as (select distinct session_id from events where name = 'signup')
      select count(*) as saw_pricing,
        count(*) filter (where session_id in (select session_id from signed_up)) as then_signed_up
      from saw_pricing`);
    expect(result.rows).toEqual([[2, 1]]);
  });

  test("mobile LCP at p75 per route", async () => {
    const result = await rows(`select route, count(*) as samples,
        percentile_cont(0.75) within group (order by value) as lcp_p75_ms
      from web_vitals
      where metric = 'lcp' and device = 'mobile' and is_human and ts between :from and :to
      group by route having count(*) >= 20 order by lcp_p75_ms desc`);
    expect(result.rows).toEqual([["/pricing", 20, 2425]]);
  });

  test("revenue per campaign", async () => {
    const result =
      await rows(`select utm_campaign, sum((props->>'revenue')::numeric) as revenue, count(*) as orders
      from events where name = 'checkout' and is_human and ts between :from and :to
      group by utm_campaign order by revenue desc nulls last`);
    expect(result.rows).toEqual([["launch", "49", 1]]);
  });

  test("people who came in through one project and later used another", async () => {
    const result = await rows(
      `select user_id, first_project, projects, first_seen from people
      where first_project = 'site' and 'other' = any(projects)`,
      ["site", "other"],
    );
    expect(result.rows).toEqual([
      ["user_1", "site", '["other","site"]', "2026-09-10T10:00:00.000Z"],
    ]);
  });

  test("the pageviews view carries the per-page facts", async () => {
    const result =
      await rows(`select event_id, page_number, is_entry, is_exit, previous_path, next_path, time_on_page_ms, scroll_depth
      from pageviews where session_id = 's1' order by page_number`);
    expect(result.rows).toEqual([
      ["e1", 1, true, false, null, "/pricing", 60000, null],
      ["e2", 2, false, true, "/", null, null, 0.8],
    ]);
  });

  test("the sessions and visitors views", async () => {
    const sessions = await rows(
      "select session_id, visit_number, since_previous_visit_ms, referrer_domain from sessions order by started_at",
    );
    expect(sessions.rows).toEqual([
      ["s1", 1, null, "google.com"],
      ["s2", 2, 172680000, null],
    ]);
    const visitors = await rows(
      "select visitor_id, visits, is_returning, user_id, traits, first_channel from visitors",
    );
    expect(visitors.rows).toEqual([["v1", 2, true, "user_1", '{"plan":"pro"}', "search"]]);
  });
});
