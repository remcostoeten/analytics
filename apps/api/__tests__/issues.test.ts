import { beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import {
  BreakdownResponse,
  ErrorRuleList,
  ErrorRuleResponse,
  IssueEventList,
  IssueList,
  IssueResponse,
  UpdatedIssue,
} from "@remcostoeten/analytics-contract";
import {
  createEngine,
  defaultEnrichers,
  defaultSignals,
  defaultStages,
} from "@remcostoeten/analytics-engine";
import { fixedClock, memoryLogger } from "@remcostoeten/analytics-engine/adapters/memory";
import { pgliteAccess, pgliteAdapters } from "@remcostoeten/analytics-engine/adapters/pglite";
import { webCryptoHasher } from "@remcostoeten/analytics-engine/adapters/system";
import { runMigrations } from "@remcostoeten/analytics-engine/db/migrate";
import {
  migrationsDirectory,
  readMigrations,
} from "@remcostoeten/analytics-engine/db/migration-files";
import type { TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

import { createApp } from "../src/app";
import { openGeo } from "../src/geo";

type Json = { [key: string]: unknown };

const now = new Date("2026-09-27T16:40:00.000Z");
const clock = fixedClock(now);
const database = new PGlite();
const hasher = webCryptoHasher();
const geo = openGeo([], []);
const stores = pgliteAccess(database);
const admin = { authorization: "Bearer at_test_admin" };

const api = createApp({
  engine: (logger) =>
    createEngine(
      { ...pgliteAdapters(database, clock), geo: geo.lookup, hasher, clock, logger },
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
  access: {
    ...stores,
    sessions: async () => null,
    hasher,
    clock: () => clock.now(),
    cronSecret: "cron-secret-for-tests",
  },
  reads: {
    store: stores.reads,
    details: stores.details,
    feed: stores.feed,
    speed: stores.speed,
    issues: stores.issues,
    live: { waitMs: 50, streamMs: 200 },
    limiter: pgliteAdapters(database, clock).limiter,
    hasher,
    ipSecret: "x".repeat(48),
    publicLimit: 1000,
    clock: () => clock.now(),
  },
  query: {
    runner: stores.queries,
    log: stores.queryLog,
    saved: stores.savedQueries,
    limiter: pgliteAdapters(database, clock).limiter,
    perMinute: 30,
  },
  authHandler: null,
});

function call(path: string, headers: { [name: string]: string } = {}) {
  return api.handle(new Request(`http://localhost${path}`, { headers }));
}

async function body(path: string, schema: TSchema, headers: { [name: string]: string } = {}) {
  const response = await call(path, headers);
  expect(response.status).toBe(200);
  const json: unknown = await response.json();
  if (!Value.Check(schema, json)) {
    const [first] = Value.Errors(schema, json);
    throw new Error(`${path} does not match its schema: ${first?.path} ${first?.message}`);
  }
  return json as Json;
}

const template = (
  JSON.parse(
    readFileSync(
      join(
        import.meta.dir,
        "../../../packages/contract/fixtures/IngestEnvelope/valid/browser-batch.json",
      ),
      "utf8",
    ),
  ) as { events: Json[] }
).events[0] as Json;
const chromeStack = `TypeError: Cannot read properties of undefined (reading 'slug')
    at PostCard (https://alpha.test/_next/static/chunks/app/page-4f2a9c1b8e.js:12:3405)
    at renderWithHooks (https://alpha.test/_next/static/chunks/node_modules/react-dom-1a2b3c.js:1:5000)`;
const reader = { authorization: "Bearer at_test_reader" };

let counter = 0;

function error(props: Json) {
  counter += 1;
  return {
    ...template,
    id: `01928c3e-7a4b-7c1d-9f00-${counter.toString(16).padStart(12, "0")}`,
    ts: "2026-09-26T10:00:00.000Z",
    page: { path: "/blog/post" },
    name: "error",
    props: { level: "error", type: "TypeError", stack: chromeStack, ...props },
  };
}

async function ingest(events: Json[]) {
  const response = await api.handle(
    new Request("http://localhost/v2/events", {
      method: "POST",
      headers: {
        "content-type": "text/plain;charset=UTF-8",
        origin: "https://alpha.test",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
        "accept-language": "en-GB",
        "sec-ch-ua": '"Chromium";v="140"',
        "sec-fetch-mode": "no-cors",
        "x-forwarded-for": "81.2.69.160",
        "x-project-key": "pk_test_alpha",
      },
      body: JSON.stringify({ v: 1, sentAt: "2026-09-26T10:00:01.000Z", events }),
    }),
  );
  if (response.status !== 202) throw new Error(await response.text());
}

let issueId = "";

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
    `INSERT INTO projects (id, name, domain, visibility, public_key, secret_key_hash, allowed_origins) VALUES
      ('alpha', 'alpha', 'alpha.test', 'public', 'pk_test_alpha', 'x', '{https://alpha.test}')`,
  );
  await database.query(
    "INSERT INTO api_tokens (id, name, token_hash, scope, project_ids) VALUES ('tok_admin', 'admin', $1, 'admin', NULL), ('tok_reader', 'reader', $2, 'read', NULL)",
    [await hasher.sha256("at_test_admin"), await hasher.sha256("at_test_reader")],
  );
  await ingest([
    error({
      message: "Cannot read properties of undefined (reading 'slug')",
      release: "a1b2c3d",
      breadcrumbs: "1790416800000 navigation /blog\n1790416801000 click BUTTON",
    }),
    error({ message: "Cannot read properties of undefined (reading 'slug')", release: "e4f5a6b" }),
  ]);
});

describe("issues", () => {
  test("need visitor-level access", async () => {
    expect((await call("/v2/projects/alpha/issues")).status).toBe(401);
  });

  test("list, detail and events", async () => {
    const list = await body("/v2/projects/alpha/issues?status=open", IssueList, reader);
    const [issue] = list.data as Json[];
    expect(issue).toMatchObject({
      title: "TypeError: Cannot read properties of undefined (reading 'slug')",
      culprit: "/_next/static/chunks/app/page.js in PostCard",
      level: "error",
      status: "open",
      isRegression: false,
      count: 2,
      visitors: 1,
      firstRelease: "a1b2c3d",
      lastRelease: "e4f5a6b",
    });
    issueId = String(issue?.id);
    const detail = await body(`/v2/projects/alpha/issues/${issueId}`, IssueResponse, reader);
    expect((detail.data as Json).id).toBe(issueId);
    const events = await body(
      `/v2/projects/alpha/issues/${issueId}/events`,
      IssueEventList,
      reader,
    );
    expect(events.data).toHaveLength(2);
    const withCrumbs = (events.data as Json[]).find(
      (event) => (event.breadcrumbs as Json[]).length > 0,
    );
    expect(withCrumbs).toMatchObject({
      release: "a1b2c3d",
      page: { path: "/blog/post" },
      error: {
        type: "TypeError",
        stack: [
          { function: "PostCard", line: 12, inApp: true },
          { function: "renderWithHooks", inApp: false },
        ],
      },
      breadcrumbs: [
        { kind: "navigation", message: "/blog" },
        { kind: "click", message: "BUTTON" },
      ],
    });
    expect((await call("/v2/projects/alpha/issues/iss_999", reader)).status).toBe(404);
    expect((await call("/v2/projects/alpha/issues?status=gone", reader)).status).toBe(400);
  });

  test("filter[issue] narrows any breakdown to one issue", async () => {
    const range = "from=2026-09-20T00:00:00.000Z&to=2026-09-28T00:00:00.000Z&traffic=all";
    const pages = await body(
      `/v2/projects/alpha/breakdown/page?${range}&filter[issue]=${issueId}&metrics=events`,
      BreakdownResponse,
    );
    expect(pages.data).toEqual([{ value: "/blog/post", events: 2, share: 1 }]);
    const none = await body(
      `/v2/projects/alpha/breakdown/page?${range}&filter[issue]=iss_999`,
      BreakdownResponse,
    );
    expect(none.data).toEqual([]);
  });

  test("admins resolve, and a recurrence reopens it as a regression", async () => {
    function patch(headers: { [name: string]: string }) {
      return api.handle(
        new Request(`http://localhost/v2/projects/alpha/issues/${issueId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json", ...headers },
          body: JSON.stringify({ status: "resolved" }),
        }),
      );
    }
    expect((await patch(reader)).status).toBe(403);
    const response = await patch(admin);
    expect(response.status).toBe(200);
    const updated: unknown = await response.json();
    expect(Value.Check(UpdatedIssue, updated)).toBe(true);
    expect((updated as { data: Json }).data).toMatchObject({ id: issueId, status: "resolved" });
    await ingest([error({ message: "Cannot read properties of undefined (reading 'slug')" })]);
    const detail = await body(`/v2/projects/alpha/issues/${issueId}`, IssueResponse, reader);
    expect(detail.data).toMatchObject({
      status: "open",
      isRegression: true,
      count: 3,
      resolvedAt: null,
    });
  });

  test("across projects", async () => {
    const all = await body("/v2/issues", IssueList, admin);
    expect(all.data).toHaveLength(1);
  });
});

describe("error rules", () => {
  function send(method: string, path: string, headers: { [name: string]: string }, json?: Json) {
    return api.handle(
      new Request(`http://localhost/v2/projects/alpha${path}`, {
        method,
        headers: { "content-type": "application/json", ...headers },
        body: json ? JSON.stringify(json) : undefined,
      }),
    );
  }

  test("need admin access", async () => {
    expect((await send("GET", "/error-rules", reader)).status).toBe(403);
    const refused = await send("POST", "/error-rules", reader, {
      kind: "ignore",
      field: "message",
      pattern: "x",
    });
    expect(refused.status).toBe(403);
  });

  test("an ignore pattern drops matching errors before grouping", async () => {
    const created = await send("POST", "/error-rules", admin, {
      kind: "ignore",
      field: "message",
      pattern: "resizeobserver loop",
    });
    expect(created.status).toBe(201);
    const rule: unknown = await created.json();
    expect(Value.Check(ErrorRuleResponse, rule)).toBe(true);
    const ruleId = (rule as { data: { id: string } }).data.id;
    await ingest([error({ type: "Error", message: "ResizeObserver loop limit exceeded" })]);
    const listed = await body("/v2/projects/alpha/issues", IssueList, admin);
    expect(
      (listed.data as { title: string }[]).some((issue) => issue.title.includes("ResizeObserver")),
    ).toBe(false);
    expect((await send("DELETE", `/error-rules/${ruleId}`, admin)).status).toBe(204);
    expect((await send("DELETE", `/error-rules/${ruleId}`, admin)).status).toBe(404);
  });

  test("a mute lists as a rule and deleting it reopens the issue", async () => {
    expect(
      (await send("POST", "/error-rules", admin, { kind: "mute", issue: issueId })).status,
    ).toBe(400);
    const created = await send("POST", "/error-rules", admin, {
      kind: "mute",
      issue: issueId,
      until: "2026-10-27T00:00:00.000Z",
      count: 10,
    });
    expect(created.status).toBe(201);
    const rules = await body("/v2/projects/alpha/error-rules", ErrorRuleList, admin);
    expect(rules.data).toEqual([
      {
        id: `mute_${issueId}`,
        kind: "mute",
        field: null,
        pattern: null,
        issue: issueId,
        until: "2026-10-27T00:00:00.000Z",
        remaining: 10,
        createdAt: null,
      },
    ]);
    const muted = await body(`/v2/projects/alpha/issues/${issueId}`, IssueResponse, admin);
    expect(muted.data).toMatchObject({ status: "ignored" });
    expect((await send("DELETE", `/error-rules/mute_${issueId}`, admin)).status).toBe(204);
    const reopened = await body(`/v2/projects/alpha/issues/${issueId}`, IssueResponse, admin);
    expect(reopened.data).toMatchObject({ status: "open" });
    const empty = await body("/v2/projects/alpha/error-rules", ErrorRuleList, admin);
    expect(empty.data).toEqual([]);
  });
});
