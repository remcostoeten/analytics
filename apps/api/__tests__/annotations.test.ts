import { beforeAll, describe, expect, test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { AnnotationList, AnnotationResponse } from "@spoar/contract";
import { createEngine, defaultEnrichers, defaultSignals, defaultStages } from "@spoar/engine";
import { fixedClock, memoryLogger } from "@spoar/engine/adapters/memory";
import { pgliteAccess, pgliteAdapters } from "@spoar/engine/adapters/pglite";
import { webCryptoHasher } from "@spoar/engine/adapters/system";
import { runMigrations } from "@spoar/engine/db/migrate";
import { migrationsDirectory, readMigrations } from "@spoar/engine/db/migration-files";
import { Type } from "@sinclair/typebox";
import type { Static, TSchema } from "@sinclair/typebox";
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
const alphaAdmin = { authorization: "Bearer at_test_alpha_admin" };
const reader = { authorization: "Bearer at_test_reader" };
const anonymous = {};

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
  annotations: stores.annotations,
  authHandler: null,
});

type Headers = { [name: string]: string };

function send(method: string, path: string, headers: Headers, json?: Json) {
  return api.handle(
    new Request(`http://localhost/v2/projects${path}`, {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: json ? JSON.stringify(json) : undefined,
    }),
  );
}

async function parsed<Schema extends TSchema>(
  response: Response,
  status: number,
  schema: Schema,
): Promise<Static<Schema>> {
  expect(response.status).toBe(status);
  const json: unknown = await response.json();
  if (!Value.Check(schema, json)) {
    const [first] = Value.Errors(schema, json);
    throw new Error(`The answer does not match its schema: ${first?.path} ${first?.message}`);
  }
  return json;
}

async function create(project: string, json: Json) {
  const answer = await parsed(
    await send("POST", `/${project}/annotations`, admin, json),
    201,
    AnnotationResponse,
  );
  return answer.data;
}

async function list(project: string, query: string, headers: Headers = admin) {
  return parsed(
    await send("GET", `/${project}/annotations?${query}`, headers),
    200,
    AnnotationList,
  );
}

const FieldError = Type.Object({
  error: Type.Object({
    code: Type.String(),
    details: Type.Object({ fields: Type.Array(Type.Object({ path: Type.String() })) }),
  }),
});

async function fieldOf(response: Response) {
  const json = await parsed(response, 400, FieldError);
  return { code: json.error.code, path: json.error.details.fields[0]?.path ?? null };
}

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
    `INSERT INTO projects (id, name, domain, visibility, public_key, secret_key_hash) VALUES
      ('alpha', 'alpha', 'alpha.test', 'public', 'pk_test_alpha', 'x'),
      ('beta', 'beta', 'beta.test', 'private', 'pk_test_beta', 'y'),
      ('delta', 'delta', 'delta.test', 'public', 'pk_test_delta', 'z')`,
  );
  await database.query(
    `INSERT INTO api_tokens (id, name, token_hash, scope, project_ids) VALUES
      ('tok_admin', 'admin', $1, 'admin', NULL),
      ('tok_alpha_admin', 'alpha admin', $2, 'admin', '{alpha}'),
      ('tok_reader', 'reader', $3, 'read', NULL)`,
    [
      await hasher.sha256("at_test_admin"),
      await hasher.sha256("at_test_alpha_admin"),
      await hasher.sha256("at_test_reader"),
    ],
  );
});

describe("create", () => {
  test("stores a calendar date as its start in UTC and defaults the kind to other", async () => {
    const created = await create("alpha", { title: "Homepage copy rewritten", date: "2026-09-01" });
    expect(created).toMatchObject({
      project: "alpha",
      title: "Homepage copy rewritten",
      date: "2026-09-01T00:00:00.000Z",
      endDate: null,
      kind: "other",
      note: null,
      url: null,
    });
    expect(created.id).toStartWith("ann_");
  });

  test("keeps every optional field", async () => {
    const created = await create("alpha", {
      title: "v2.0 released",
      date: "2026-09-10T09:30:00+02:00",
      endDate: "2026-09-12",
      kind: "release",
      note: "New onboarding flow.",
      url: "https://github.com/remcostoeten/skriuw/releases/tag/v2.0.0",
    });
    expect(created).toMatchObject({
      date: "2026-09-10T07:30:00.000Z",
      endDate: "2026-09-12T00:00:00.000Z",
      kind: "release",
      note: "New onboarding flow.",
      url: "https://github.com/remcostoeten/skriuw/releases/tag/v2.0.0",
    });
  });

  test("rejects invalid input with the field's path", async () => {
    const cases: [Json, string][] = [
      [{ title: "", date: "2026-09-01" }, "/title"],
      [{ title: "x".repeat(121), date: "2026-09-01" }, "/title"],
      [{ title: "Mirror", date: "2026-09-01", url: "ftp://example.com/file" }, "/url"],
      [{ title: "Script", date: "2026-09-01", url: "javascript:alert(1)" }, "/url"],
      [{ title: "Sale", date: "2026-09-01", kind: "campaign" }, "/kind"],
      [{ title: "Outage", date: "1 September" }, "/date"],
      [{ title: "Outage", date: "2026-09-01", note: "x".repeat(2001) }, "/note"],
      [{ title: "Outage", date: "2026-09-02", endDate: "2026-09-01" }, "/endDate"],
    ];
    for (const [json, path] of cases) {
      const refused = await send("POST", "/alpha/annotations", admin, json);
      expect(refused.status).toBe(400);
      expect(await fieldOf(refused)).toEqual({ code: "VALIDATION_FAILED", path });
    }
  });
});

describe("access", () => {
  test("writes need an admin of the project, and a private project is hidden from others", async () => {
    const json = { title: "Posted on Hacker News", date: "2026-09-20" };
    expect((await send("POST", "/alpha/annotations", anonymous, json)).status).toBe(401);
    expect((await send("POST", "/alpha/annotations", reader, json)).status).toBe(403);
    expect((await send("POST", "/delta/annotations", alphaAdmin, json)).status).toBe(403);
    expect((await send("POST", "/beta/annotations", alphaAdmin, json)).status).toBe(404);
    expect((await send("POST", "/alpha/annotations", alphaAdmin, json)).status).toBe(201);
  });

  test("reads follow the project's visibility", async () => {
    const open = await list("alpha", "period=30d", anonymous);
    expect(open.data.length).toBeGreaterThan(0);
    await create("beta", { title: "Private launch", date: "2026-09-15" });
    expect((await send("GET", "/beta/annotations?period=30d", anonymous)).status).toBe(404);
    const closed = await list("beta", "period=30d", reader);
    expect(closed.data.map((one) => one.title)).toEqual(["Private launch"]);
  });

  test("an annotation is reachable only through its own project", async () => {
    const [own] = (await list("beta", "period=30d")).data;
    const path = `/alpha/annotations/${own?.id}`;
    expect((await send("PATCH", path, admin, { title: "Moved" })).status).toBe(404);
    expect((await send("DELETE", path, admin)).status).toBe(404);
    expect((await send("DELETE", `/beta/annotations/${own?.id}`, alphaAdmin)).status).toBe(404);
  });

  test("an unknown project answers 404", async () => {
    expect(
      (await send("POST", "/gamma/annotations", admin, { title: "x", date: "2026-09-01" })).status,
    ).toBe(404);
  });
});

describe("list by date range", () => {
  test("answers what overlaps the range, by date", async () => {
    await create("alpha", { title: "Before", date: "2026-08-01" });
    await create("alpha", { title: "Spans into range", date: "2026-08-30", endDate: "2026-09-03" });
    await create("alpha", { title: "At the end", date: "2026-09-05" });
    const listed = await list("alpha", "from=2026-09-01T00:00:00Z&to=2026-09-05T00:00:00Z");
    expect(listed.data.map((one) => one.title)).toEqual([
      "Spans into range",
      "Homepage copy rewritten",
    ]);
    expect(listed.nextCursor).toBeNull();
  });

  test("defaults to the last 30 days and pages with limit and cursor", async () => {
    const first = await list("alpha", "limit=2");
    expect(first.data).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();
    const rest = await list("alpha", `limit=100&cursor=${first.nextCursor}`);
    const titles = [...first.data, ...rest.data].map((one) => one.title);
    expect(titles).not.toContain("Before");
    expect(titles[0]).toBe("Spans into range");
    expect(rest.nextCursor).toBeNull();
  });

  test("rejects a half range", async () => {
    expect((await send("GET", "/alpha/annotations?from=2026-09-01T00:00:00Z", admin)).status).toBe(
      400,
    );
  });
});

describe("update", () => {
  test("changes the fields sent and clears the ones sent as null", async () => {
    const created = await create("alpha", {
      title: "Outage",
      date: "2026-09-21T10:00:00Z",
      endDate: "2026-09-21T12:00:00Z",
      note: "Failover",
    });
    const path = `/alpha/annotations/${created.id}`;
    const changed = await parsed(
      await send("PATCH", path, admin, { kind: "incident", endDate: null, note: null }),
      200,
      AnnotationResponse,
    );
    expect(changed.data).toMatchObject({
      title: "Outage",
      date: "2026-09-21T10:00:00.000Z",
      endDate: null,
      kind: "incident",
      note: null,
    });
  });

  test("checks the resulting span", async () => {
    const created = await create("alpha", {
      title: "Sale week",
      date: "2026-09-14",
      endDate: "2026-09-20",
    });
    const path = `/alpha/annotations/${created.id}`;
    const refused = await send("PATCH", path, admin, { date: "2026-09-25" });
    expect(await fieldOf(refused)).toEqual({ code: "VALIDATION_FAILED", path: "/endDate" });
    expect((await send("PATCH", path, admin, { date: "2026-09-25", endDate: null })).status).toBe(
      200,
    );
  });

  test("rejects an empty body and an unknown id", async () => {
    const [one] = (await list("alpha", "period=30d")).data;
    expect((await send("PATCH", `/alpha/annotations/${one?.id}`, admin, {})).status).toBe(400);
    expect(
      (await send("PATCH", "/alpha/annotations/ann_missing", admin, { title: "x" })).status,
    ).toBe(404);
  });
});

describe("delete", () => {
  test("removes it once", async () => {
    const created = await create("alpha", { title: "Temporary", date: "2026-09-26" });
    const path = `/alpha/annotations/${created.id}`;
    expect((await send("DELETE", path, reader)).status).toBe(403);
    expect((await send("DELETE", path, admin)).status).toBe(204);
    expect((await send("DELETE", path, admin)).status).toBe(404);
    const listed = await list("alpha", "period=30d");
    expect(listed.data.map((one) => one.title)).not.toContain("Temporary");
  });
});
