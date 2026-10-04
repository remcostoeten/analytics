import { beforeAll, describe, expect, test } from "bun:test";

import { PGlite } from "@electric-sql/pglite";
import {
  ActiveVisitors,
  ApiError,
  LiveSessions,
  LogList,
  Overview,
  RealtimeResponse,
  VisitorDetail,
  WidgetSession,
} from "@spoar/contract";
import { createEngine, defaultEnrichers, defaultSignals, defaultStages } from "@spoar/engine";
import { fixedClock, memoryLogger } from "@spoar/engine/adapters/memory";
import { pgliteAccess, pgliteAdapters } from "@spoar/engine/adapters/pglite";
import { webCryptoHasher } from "@spoar/engine/adapters/system";
import { runMigrations } from "@spoar/engine/db/migrate";
import { migrationsDirectory, readMigrations } from "@spoar/engine/db/migration-files";
import type { TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

import type { SignedIn } from "../src/access/types";
import { createApp } from "../src/app";
import { openGeo } from "../src/geo";

type Json = { [key: string]: unknown };
type Headers = { [name: string]: string };

const now = new Date("2026-10-03T14:02:00.000Z");
const clock = fixedClock(now);
const database = new PGlite();
const hasher = webCryptoHasher();
const geo = openGeo([], []);
const stores = pgliteAccess(database);
const adapters = pgliteAdapters(database, clock);
const cronSecret = "cron-secret-for-widget-tests";
const site = "https://noorderlicht.example";
const project = "noorderlicht";
const visitor = "8c4e1f0a-2b3c-4d5e-8f60-718293a4b5c6";
const session = "f1a2b3c4-d5e6-4f70-8a91-b2c3d4e5f607";
const release = "2026.10.03-a1";
const read = { authorization: "Bearer at_test_read" };
const admin = { authorization: "Bearer at_test_admin" };
const chrome =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

const users: { [cookie: string]: SignedIn } = {
  owner: {
    userId: "u_owner",
    name: "Remco",
    login: "remcostoeten",
    image: null,
    expiresAt: new Date("2026-10-10T00:00:00.000Z"),
  },
  viewer: {
    userId: "u_viewer",
    name: "Viewer",
    login: "viewer",
    image: null,
    expiresAt: new Date("2026-10-10T00:00:00.000Z"),
  },
};

async function sessions(headers: globalThis.Headers) {
  const match = /ra\.session_token=([\w-]+)/.exec(headers.get("cookie") ?? "");
  return match?.[1] ? (users[match[1]] ?? null) : null;
}

const api = createApp({
  engine: (logger) =>
    createEngine(
      { ...adapters, geo: geo.lookup, hasher, clock, logger, logs: stores.logs },
      {
        stages: defaultStages,
        signals: defaultSignals,
        enrichers: defaultEnrichers,
        dimensions: [],
      },
      { ipSecret: "x".repeat(48), rateLimit: { limit: 1000, windowSeconds: 60 } },
    ),
  logger: () => memoryLogger(),
  clock: () => clock.now(),
  dashboardOrigin: null,
  docsBase: "https://api.example.test/v2/openapi",
  geo: { city: geo.city, asn: geo.asn, loadMs: geo.loadMs },
  access: { ...stores, sessions, hasher, clock: () => clock.now(), cronSecret },
  reads: {
    store: stores.reads,
    details: stores.details,
    feed: stores.feed,
    speed: stores.speed,
    issues: stores.issues,
    live: { waitMs: 50, streamMs: 200 },
    limiter: adapters.limiter,
    hasher,
    ipSecret: "x".repeat(48),
    publicLimit: 1000,
    clock: () => clock.now(),
  },
  query: {
    runner: stores.queries,
    log: stores.queryLog,
    saved: stores.savedQueries,
    limiter: adapters.limiter,
    perMinute: 30,
  },
  annotations: stores.annotations,
  authHandler: null,
  ops: stores.ops,
  widget: {
    store: stores.widget,
    logs: stores.logs,
    keys: adapters.projects,
    limiter: adapters.limiter,
    reportsPerMinute: 1000,
  },
});

type Init = { method?: string; body?: string; headers?: Headers };

function call(path: string, headers: Headers = {}, init: Init = {}) {
  return api.handle(
    new Request(`http://localhost${path}`, {
      method: init.method,
      body: init.body,
      headers: { ...headers, ...init.headers },
    }),
  );
}

function checked(path: string, schema: TSchema, json: unknown) {
  if (!Value.Check(schema, json)) {
    const [first] = Value.Errors(schema, json);
    throw new Error(`${path} does not match its schema: ${first?.path} ${first?.message}`);
  }
  return json as Json;
}

async function body(path: string, schema: TSchema, headers: Headers = read) {
  const response = await call(path, headers);
  expect(response.status).toBe(200);
  return checked(path, schema, await response.json());
}

async function failed(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  const json = checked("error", ApiError, await response.json());
  expect((json.error as Json).code).toBe(code);
}

function wire(id: string, name: string, extra: Json = {}) {
  return {
    id,
    name,
    ts: "2026-10-03T14:01:30.000Z",
    visitor,
    session,
    page: { path: "/pricing", referrer: "https://www.google.com/" },
    props: {},
    context: { lang: "nl-NL", release },
    signals: 0,
    ...extra,
  };
}

function ingest(events: unknown[], headers: Headers = {}) {
  return api.handle(
    new Request("http://localhost/v2/events", {
      method: "POST",
      headers: {
        "content-type": "text/plain;charset=UTF-8",
        origin: site,
        "user-agent": chrome,
        "sec-ch-ua": '"Chromium";v="140"',
        "sec-fetch-mode": "no-cors",
        "accept-language": "nl-NL",
        "x-forwarded-for": "81.2.69.160",
        "x-project-key": "pk_test_noord",
        ...headers,
      },
      body: JSON.stringify({ v: 1, sentAt: now.toISOString(), events }),
    }),
  );
}

function report(logs: unknown[], path = project, headers: Headers = {}) {
  return call(
    `/v2/projects/${path}/logs/client`,
    { "content-type": "text/plain", origin: site, "x-project-key": "pk_test_noord", ...headers },
    { method: "POST", body: JSON.stringify({ logs }) },
  );
}

const tooManyProps = Object.fromEntries(
  Array.from({ length: 26 }, (_, index) => [`key${index}`, `secret-value-${index}`]),
);

beforeAll(async () => {
  const report = await runMigrations(
    {
      execute: async (statement) => {
        await database.exec(statement);
      },
      applied: async () => [],
      record: async () => {},
    },
    readMigrations(migrationsDirectory),
    { dryRun: false, baseline: null },
  );
  if (!report.ok) throw new Error(report.error.message);
  await database.query(
    `INSERT INTO projects (id, name, domain, visibility, allowed_origins, public_key, secret_key_hash)
     VALUES ($1, 'Noorderlicht', 'noorderlicht.example', 'public', $2, 'pk_test_noord', 'x'),
       ('other', 'Other', 'other.example', 'public', $3, 'pk_test_other', 'y')`,
    [project, [site], ["https://other.example"]],
  );
  await database.query(
    "INSERT INTO api_tokens (id, name, token_hash, scope, project_ids) VALUES ('tok_read', 'read', $1, 'read', NULL), ('tok_admin', 'admin', $2, 'admin', NULL)",
    [await hasher.sha256("at_test_read"), await hasher.sha256("at_test_admin")],
  );
  await database.query(
    "INSERT INTO auth_organization (id, name, slug) VALUES ('org_main', 'Main', 'main')",
  );
  await database.query(
    `INSERT INTO auth_user (id, name, email) VALUES ('u_owner', 'Remco', 'owner@example.test'),
       ('u_viewer', 'Viewer', 'viewer@example.test')`,
  );
  await database.query(
    `INSERT INTO auth_member (id, organization_id, user_id, role, project_ids)
     VALUES ('mem_owner', 'org_main', 'u_owner', 'owner', NULL),
       ('mem_viewer', 'org_main', 'u_viewer', 'viewer', ARRAY['noorderlicht'])`,
  );
  const stored = await ingest([
    wire("01928c3e-0000-7000-8000-000000000001", "pageview", { signals: 2 }),
    wire("01928c3e-0000-7000-8000-000000000002", "identify", {
      props: { userId: "user_42", plan: "pro" },
    }),
    wire("01928c3e-0000-7000-8000-000000000003", "quote_requested", { props: tooManyProps }),
  ]);
  expect(await stored.json()).toMatchObject({ accepted: 2, duplicates: 0 });
  await ingest([wire("01928c3e-0000-7000-8000-000000000001", "pageview", { signals: 2 })]);
  await database.query(
    `INSERT INTO events (project_id, type, name, ts, received_at, path, visitor_id, session_id, fingerprint, bot_score)
     VALUES ($1, 'pageview', 'pageview', '2026-09-20T10:00:00Z', '2026-09-20T10:00:00Z', '/', 'legacy-visitor', 'legacy-session', 'legacy-1', 0)`,
    [project],
  );
}, 20_000);

describe("GET /v2/widget/session", () => {
  test("403 ORIGIN_NOT_ALLOWED when no project lists the origin", async () => {
    const response = await call("/v2/widget/session", {
      origin: "https://elsewhere.example",
      cookie: "ra.session_token=owner",
    });
    await failed(response, 403, "ORIGIN_NOT_ALLOWED");
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
  });

  test("401 AUTH_REQUIRED without a session, with credentialed CORS for a listed origin", async () => {
    const response = await call("/v2/widget/session", { origin: site });
    await failed(response, 401, "AUTH_REQUIRED");
    expect(response.headers.get("access-control-allow-origin")).toBe(site);
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
  });

  test("403 FORBIDDEN for a member who cannot administer the project", async () => {
    const response = await call("/v2/widget/session", {
      origin: site,
      cookie: "ra.session_token=viewer",
    });
    await failed(response, 403, "FORBIDDEN");
  });

  test("an admin gets a 15-minute widget token bound to the project", async () => {
    const started = await body("/v2/widget/session", WidgetSession, {
      origin: site,
      cookie: "ra.session_token=owner",
    });
    expect(started).toMatchObject({
      project,
      projectName: "Noorderlicht",
      publicKey: "pk_test_noord",
      access: "admin",
      user: { id: "u_owner", name: "Remco" },
      release,
      expiresAt: "2026-10-03T14:17:00.000Z",
      features: { logs: true, speed: true, issues: true, reports: false },
    });
    const token = String(started.token);
    expect(token.startsWith("wt_")).toBe(true);
    const bearer = { authorization: `Bearer ${token}` };
    expect((await call(`/v2/projects/${project}/logs`, bearer)).status).toBe(200);
    await failed(await call("/v2/projects/other/logs", bearer), 403, "FORBIDDEN");
    await failed(await call("/v2/tokens", bearer), 403, "FORBIDDEN");
    await failed(
      await call("/v2/tokens", bearer, {
        method: "POST",
        body: JSON.stringify({ name: "escalate", scope: "admin" }),
        headers: { "content-type": "application/json" },
      }),
      403,
      "FORBIDDEN",
    );
    await failed(
      await call(`/v2/projects/${project}/logs`, {
        authorization: `Bearer at_${token.slice(3)}`,
      }),
      401,
      "UNAUTHORIZED",
    );
  });

  test("GET /v2/tokens never lists widget tokens", async () => {
    await body("/v2/widget/session", WidgetSession, {
      origin: site,
      cookie: "ra.session_token=owner",
    });
    const response = await call("/v2/tokens", admin);
    expect(response.status).toBe(200);
    const tokens = ((await response.json()) as { data: Json[] }).data;
    const ids = tokens.map((token) => String(token.id));
    expect(ids.sort((left, right) => left.localeCompare(right))).toEqual(["tok_admin", "tok_read"]);
    const stored = await database.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM api_tokens WHERE kind = 'widget'",
    );
    expect(stored.rows[0]?.count).toBeGreaterThan(0);
  });
});

describe("active visitors", () => {
  test("one row per visitor from the last five minutes, without the user id", async () => {
    const list = await body(`/v2/projects/${project}/realtime/visitors`, ActiveVisitors);
    expect(list.data).toEqual([
      {
        visitor,
        session,
        lastSeen: now.toISOString(),
        path: "/pricing",
        referrer: "https://www.google.com/",
        country: null,
        city: null,
        device: "desktop",
        browser: "Chrome",
        os: "macOS",
        pages: 1,
        duration: 0,
        botScore: 25,
        identified: true,
      },
    ]);
    expect(JSON.stringify(list)).not.toContain("user_42");
    expect(JSON.stringify(list)).not.toContain("81.2.69.160");
  });

  test("checks limit and needs detail access", async () => {
    await failed(
      await call(`/v2/projects/${project}/realtime/visitors?limit=201`, read),
      400,
      "VALIDATION_FAILED",
    );
    await failed(await call(`/v2/projects/${project}/realtime/visitors`), 401, "UNAUTHORIZED");
  });

  test("realtime?include=visitors adds the rows for detail callers only", async () => {
    const combined = await body(
      `/v2/projects/${project}/realtime?include=visitors`,
      RealtimeResponse,
    );
    expect((combined.visitors as Json[]).map((row) => row.visitor)).toEqual([visitor]);
    const plain = await body(`/v2/projects/${project}/realtime`, RealtimeResponse, {});
    expect(plain.visitors).toBeUndefined();
    await failed(
      await call(`/v2/projects/${project}/realtime?include=visitors`),
      401,
      "UNAUTHORIZED",
    );
  });
});

describe("live sessions", () => {
  test("one row per active session with its trail and signal", async () => {
    const list = await body(`/v2/projects/${project}/realtime/sessions`, LiveSessions);
    expect(list.data).toEqual([
      {
        id: session,
        visitor,
        startedAt: "2026-10-03T14:01:30.000Z",
        lastSeen: now.toISOString(),
        trail: ["/pricing"],
        pages: 1,
        events: 2,
        durationMs: 0,
        referrer: "https://www.google.com/",
        country: null,
        device: "desktop",
        botScore: 25,
        signal: "suspect",
      },
    ]);
    expect(list.window).toEqual({ from: "2026-10-03T13:57:00.000Z", to: now.toISOString() });
  });

  test("checks limit and needs detail access", async () => {
    await failed(
      await call(`/v2/projects/${project}/realtime/sessions?limit=0`, read),
      400,
      "VALIDATION_FAILED",
    );
    await failed(await call(`/v2/projects/${project}/realtime/sessions`), 401, "UNAUTHORIZED");
  });
});

describe("bot signal detail", () => {
  test("the stored breakdown behind the visitor's score", async () => {
    const detail = await body(`/v2/projects/${project}/visitors/${visitor}`, VisitorDetail);
    expect((detail.data as Json).bot).toEqual({
      score: 25,
      verdict: "suspect",
      signals: {
        headless: true,
        webdriver: false,
        datacenterAsn: null,
        pointerEvents: false,
        uaMismatch: false,
        uniformDwell: null,
      },
    });
  });

  test("rows stored before the column existed answer null for every signal", async () => {
    const detail = await body(`/v2/projects/${project}/visitors/legacy-visitor`, VisitorDetail);
    expect((detail.data as Json).bot).toEqual({
      score: 0,
      verdict: "human",
      signals: {
        headless: null,
        webdriver: null,
        datacenterAsn: null,
        pointerEvents: null,
        uaMismatch: null,
        uniformDwell: null,
      },
    });
  });
});

describe("GET /v2/projects/:project/logs", () => {
  test("a rejected event is logged with its code and field, never its values", async () => {
    const list = await body(`/v2/projects/${project}/logs?level=error`, LogList, admin);
    const [line] = list.data as Json[];
    expect(line).toMatchObject({
      level: "error",
      kind: "ingest",
      source: "api",
      visitor,
      session,
      data: {
        code: "RA_INGEST_REJECTED",
        reason: "VALIDATION_FAILED",
        index: 2,
        event: "quote_requested",
        field: "props",
      },
    });
    expect(String(line?.message).startsWith("RA_INGEST_REJECTED")).toBe(true);
    expect(JSON.stringify(list)).not.toContain("secret-value");
  });

  test("batches, duplicates and bot verdicts are logged", async () => {
    const list = await body(`/v2/projects/${project}/logs`, LogList, admin);
    const codes = (list.data as Json[]).map((line) => (line.data as Json).code);
    expect(codes).toContain("RA_INGEST_BATCH");
    expect(codes).toContain("RA_INGEST_DUPLICATE");
    expect(codes).toContain("RA_BOT_VERDICT");
    const verdicts = await body(`/v2/projects/${project}/logs?kind=signals`, LogList, admin);
    expect((verdicts.data as Json[])[0]).toMatchObject({
      level: "info",
      source: "engine",
      data: { verdict: "suspect", score: 25, reasons: ["client_headless"] },
    });
    const searched = await body(`/v2/projects/${project}/logs?q=already%20stored`, LogList, admin);
    expect(searched.data as Json[]).toHaveLength(1);
  });

  test("after a cursor the long-poll ends empty, and the stream answers event-stream", async () => {
    const latest = await body(`/v2/projects/${project}/logs`, LogList, admin);
    const after = await body(
      `/v2/projects/${project}/logs?after=${String(latest.nextCursor)}`,
      LogList,
      admin,
    );
    expect(after).toEqual({ data: [], nextCursor: latest.nextCursor });
    const stream = await call(`/v2/projects/${project}/logs`, {
      ...admin,
      accept: "text/event-stream",
    });
    expect(stream.headers.get("content-type")).toContain("text/event-stream");
    expect(await stream.text()).toContain("event: logs");
  });

  test("needs admin access and known filters", async () => {
    await failed(await call(`/v2/projects/${project}/logs`, read), 403, "FORBIDDEN");
    await failed(await call(`/v2/projects/${project}/logs`), 401, "UNAUTHORIZED");
    await failed(
      await call(`/v2/projects/${project}/logs?level=loud`, admin),
      400,
      "VALIDATION_FAILED",
    );
  });
});

describe("POST /v2/projects/:project/logs/client", () => {
  const drop = {
    kind: "transport",
    level: "warn",
    message: "RA_DROP beacon refused for owner@example.test",
    data: { events: 3, contact: "owner@example.test", address: "81.2.69.160" },
    visitor,
    session,
    ts: "2026-10-03T14:01:59.000Z",
  };

  test("refused while widgetReports is off", async () => {
    await failed(await report([drop]), 403, "WIDGET_REPORTS_DISABLED");
  });

  test("stored as sdk lines once widgetReports is on, with personal data replaced", async () => {
    const patched = await call(`/v2/projects/${project}`, admin, {
      method: "PATCH",
      body: JSON.stringify({ widgetReports: true }),
      headers: { "content-type": "application/json" },
    });
    expect(patched.status).toBe(200);
    expect(((await patched.json()) as { data: Json }).data.widgetReports).toBe(true);
    const response = await report([drop]);
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ accepted: 1 });
    const list = await body(`/v2/projects/${project}/logs?source=sdk`, LogList, admin);
    expect(list.data).toEqual([
      expect.objectContaining({
        level: "warn",
        kind: "transport",
        source: "sdk",
        message: "RA_DROP beacon refused for [redacted]",
        data: { events: 3, contact: "[redacted]", address: "[redacted]" },
        visitor,
        session,
      }),
    ]);
  });

  test("checks the key, the size and the batch length", async () => {
    await failed(await report([drop], "other"), 403, "FORBIDDEN");
    await failed(
      await report([drop], project, { "x-project-key": "pk_missing" }),
      401,
      "UNAUTHORIZED",
    );
    const large = { ...drop, message: "x".repeat(500), data: { note: "y".repeat(255) } };
    await failed(await report(Array.from({ length: 20 }, () => large)), 413, "PAYLOAD_TOO_LARGE");
    await failed(await report(Array.from({ length: 21 }, () => drop)), 400, "VALIDATION_FAILED");
  });
});

describe("GET /v2/projects/:project/overview", () => {
  test("composes the status numbers and caches them for 10 seconds", async () => {
    const first = await body(`/v2/projects/${project}/overview`, Overview, {});
    expect(first).toEqual({
      online: 1,
      viewsPerMinute: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      today: { visitors: 1, pageviews: 1, bounceRate: 1, avgSessionSeconds: 0 },
      ingest: { last24h: { accepted: 2, duplicates: 1, rejected: 1, rateLimited: 0 } },
      bots: { share: 0, headless: 1, webdriver: 0, datacenterAsn: 0 },
      speed: { lcp: null, inp: null, cls: null, ttfb: null },
      errors: { last30m: 0, openIssues: 0 },
      topPages: [{ path: "/pricing", views: 1 }],
      referrers: [{ name: "google.com", share: 1 }],
      countries: [],
      release: { current: release, deployedAt: "2026-10-03T14:01:30.000Z", newIssuesSince: 0 },
    });
    await ingest([
      wire("01928c3e-0000-7000-8000-000000000009", "pageview", {
        visitor: "f0f0f0f0-0000-4000-8000-000000000009",
      }),
    ]);
    const second = await body(`/v2/projects/${project}/overview`, Overview, {});
    expect(second).toEqual(first);
  });
});

describe("cleanup", () => {
  test("drops log lines older than 7 days and expired widget tokens, and logs the run", async () => {
    await database.query(
      `INSERT INTO logs (project, ts, level, kind, source, message) VALUES ($1, '2026-09-25T00:00:00Z', 'info', 'jobs', 'cron', 'old')`,
      [project],
    );
    await database.query(
      `INSERT INTO api_tokens (id, name, token_hash, scope, project_ids, kind, expires_at)
       VALUES ('tok_expired', 'Widget', 'expired-hash', 'admin', ARRAY['noorderlicht'], 'widget', '2026-10-03T13:00:00Z')`,
    );
    const response = await call(
      "/v2/admin/jobs/cleanup",
      { authorization: `Bearer ${cronSecret}` },
      { method: "POST" },
    );
    expect(response.status).toBe(200);
    const old = await database.query("SELECT id FROM logs WHERE message = 'old'");
    expect(old.rows).toHaveLength(0);
    const expired = await database.query("SELECT id FROM api_tokens WHERE id = 'tok_expired'");
    expect(expired.rows).toHaveLength(0);
    const jobs = await body(`/v2/projects/${project}/logs?kind=jobs`, LogList, admin);
    expect((jobs.data as Json[]).at(-1)).toMatchObject({
      level: "ok",
      source: "cron",
      data: { code: "RA_JOB", job: "cleanup", status: "ok" },
    });
  });
});
