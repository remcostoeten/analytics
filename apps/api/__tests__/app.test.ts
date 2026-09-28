import { beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
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

import { createApp } from "../src/app";
import { openGeo } from "../src/geo";

const now = new Date("2026-09-28T12:00:00.000Z");
const clock = fixedClock(now);
const database = new PGlite();
const logs = memoryLogger();
const geo = openGeo([join(import.meta.dir, "fixtures", "GeoIP2-City-Test.mmdb")], []);
const publicKey = "pk_test";
const testKey = "sk_test";
const docsBase = "https://api.example.test/v2/openapi";
const chrome =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const envelope = JSON.parse(
  readFileSync(
    join(
      import.meta.dir,
      "../../../packages/contract/fixtures/IngestEnvelope/valid/browser-batch.json",
    ),
    "utf8",
  ),
) as { v: 1; sentAt: string; events: { [key: string]: unknown }[] };

function app(limit = 1000) {
  return createApp({
    engine: (logger) =>
      createEngine(
        {
          ...pgliteAdapters(database, clock),
          geo: geo.lookup,
          hasher: webCryptoHasher(),
          clock,
          logger,
        },
        {
          stages: defaultStages,
          signals: defaultSignals,
          enrichers: defaultEnrichers,
          dimensions: [],
        },
        {
          ipSecret: "test-secret-that-is-at-least-32-characters",
          rateLimit: { limit, windowSeconds: 60 },
        },
      ),
    logger: () => logs,
    clock: () => clock.now(),
    dashboardOrigin: "https://dashboard.example.test",
    docsBase,
    geo: { city: geo.city, asn: geo.asn, loadMs: geo.loadMs },
    access: {
      ...pgliteAccess(database),
      sessions: async () => null,
      hasher: webCryptoHasher(),
      clock: () => clock.now(),
      cronSecret: null,
    },
    reads: {
      store: pgliteAccess(database).reads,
      details: pgliteAccess(database).details,
      limiter: pgliteAdapters(database, clock).limiter,
      hasher: webCryptoHasher(),
      ipSecret: "x".repeat(48),
      publicLimit: 1000,
      clock: () => clock.now(),
    },
    authHandler: null,
  });
}

const api = app();

function ids(seed: string) {
  return envelope.events.map((event, index) => ({
    ...event,
    id: `01928c3e-7a4b-7c1d-9f00-${seed.padStart(10, "0")}${String(index).padStart(2, "0")}`,
  }));
}

function post(body: string, headers: { [name: string]: string } = {}, target = api) {
  return target.handle(
    new Request("http://localhost/v2/events", {
      method: "POST",
      headers: {
        "content-type": "text/plain;charset=UTF-8",
        origin: "https://remcostoeten.nl",
        "user-agent": chrome,
        "accept-language": "en-GB",
        "sec-ch-ua": '"Chromium";v="140"',
        "sec-fetch-mode": "no-cors",
        "x-forwarded-for": "81.2.69.160",
        "x-project-key": publicKey,
        ...headers,
      },
      body,
    }),
  );
}

function batch(seed: string, events: unknown[] = ids(seed)) {
  return JSON.stringify({ ...envelope, events });
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
  const secretHash = await webCryptoHasher().sha256(testKey);
  await database.query(
    "INSERT INTO projects (id, name, domain, allowed_origins, public_key, secret_key_hash) VALUES ('site', 'site', 'remcostoeten.nl', $1, $2, $3)",
    [["https://remcostoeten.nl"], publicKey, secretHash],
  );
});

describe("POST /v2/events", () => {
  test("202 with every event accepted, stored with geo and a request id", async () => {
    const response = await post(batch("1"));
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ accepted: 2, duplicates: 0, rejected: [] });
    expect(response.headers.get("x-request-id")).toStartWith("req_");
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    const rows = await database.query<{ country: string; bot_score: number }>(
      "SELECT country, bot_score FROM events WHERE project_id = 'site' ORDER BY ts",
    );
    expect(rows.rows).toEqual([
      { country: "GB", bot_score: 0 },
      { country: "GB", bot_score: 0 },
    ]);
  });

  test("the same batch again comes back as duplicates", async () => {
    const response = await post(batch("1"));
    expect(await response.json()).toEqual({ accepted: 0, duplicates: 2, rejected: [] });
  });

  test("application/json with the secret key from any origin", async () => {
    const response = await post(batch("2"), {
      "content-type": "application/json",
      origin: "https://proxy.example.test",
      "x-project-key": "",
      authorization: `Bearer ${testKey}`,
    });
    expect(response.status).toBe(202);
    expect((await response.json()).accepted).toBe(2);
  });

  test("a bad event is rejected by index while the rest are stored", async () => {
    const [first, second] = ids("3");
    const response = await post(batch("3", [first ?? {}, { ...second, name: "" }]));
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({
      accepted: 1,
      duplicates: 0,
      rejected: [
        {
          index: 1,
          code: "VALIDATION_FAILED",
          message: "events[1].name: Expected string length greater or equal to 1",
        },
      ],
    });
  });

  test("400 for an envelope that fails the schema, with each field", async () => {
    const response = await post(JSON.stringify({ v: 2, sentAt: "now", events: [] }), {
      "x-request-id": "req_from_client_1",
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatchObject({
      code: "VALIDATION_FAILED",
      requestId: "req_from_client_1",
      docs: `${docsBase}#errors/VALIDATION_FAILED`,
    });
    expect(body.error.details.fields.map((field: { path: string }) => field.path)).toContain("/v");
    expect(response.headers.get("x-request-id")).toBe("req_from_client_1");
  });

  test("400 for a body that is not JSON", async () => {
    const response = await post("{nope");
    expect(response.status).toBe(400);
    expect((await response.json()).error.message).toBe("The body is not valid JSON");
  });

  test("the public key can come from the key query parameter, as sendBeacon sends it", async () => {
    const response = await api.handle(
      new Request(`http://localhost/v2/events?key=${publicKey}`, {
        method: "POST",
        headers: {
          "content-type": "text/plain;charset=UTF-8",
          origin: "https://remcostoeten.nl",
          "user-agent": chrome,
          "accept-language": "en-GB",
        },
        body: batch("10"),
      }),
    );
    expect(response.status).toBe(202);
    expect((await response.json()).accepted).toBe(2);
  });

  test("401 for an unknown key", async () => {
    const response = await post(batch("4"), { "x-project-key": "pk_unknown" });
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("UNAUTHORIZED");
  });

  test("401 without any key", async () => {
    const response = await post(batch("4"), { "x-project-key": "" });
    expect(response.status).toBe(401);
  });

  test("403 for an origin the key does not allow", async () => {
    const response = await post(batch("5"), { origin: "https://example.com" });
    expect(response.status).toBe(403);
    expect((await response.json()).error).toMatchObject({
      code: "FORBIDDEN_ORIGIN",
      message: "Origin https://example.com is not allowed for this project",
    });
  });

  test("413 for a body over 60 KB", async () => {
    const [first] = ids("6");
    const padded = { ...first, props: { note: "x".repeat(61 * 1024) } };
    const response = await post(batch("6", [padded]));
    expect(response.status).toBe(413);
    expect((await response.json()).error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  test("413 for more than 50 events", async () => {
    const [first] = ids("7");
    const many = Array.from({ length: 51 }, () => first ?? {});
    const response = await post(batch("7", many));
    expect(response.status).toBe(413);
    expect((await response.json()).error.message).toBe("A batch holds at most 50 events");
  });

  test("429 with Retry-After once the IP hash hits the limit", async () => {
    const limited = app(1);
    await post(batch("8"), { "x-forwarded-for": "2.125.160.216" }, limited);
    const response = await post(batch("9"), { "x-forwarded-for": "2.125.160.216" }, limited);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    expect((await response.json()).error).toMatchObject({
      code: "RATE_LIMITED",
      message: "Too many requests",
      details: { retryAfterSeconds: 60 },
    });
  });
});

describe("CORS", () => {
  test("a preflight answers 204 with the allowed headers", async () => {
    const response = await api.handle(
      new Request("http://localhost/v2/events", {
        method: "OPTIONS",
        headers: { origin: "https://remcostoeten.nl", "access-control-request-method": "POST" },
      }),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-headers")).toContain("x-project-key");
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
  });

  test("the dashboard origin gets credentials", async () => {
    const response = await api.handle(
      new Request("http://localhost/v2/health", {
        headers: { origin: "https://dashboard.example.test" },
      }),
    );
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://dashboard.example.test",
    );
    expect(response.headers.get("access-control-allow-credentials")).toBe("true");
  });
});

describe("GET /v2/health", () => {
  test("reports version, runtime, cold start, the IP header and the geo files", async () => {
    const fresh = app();
    const first = await (await fresh.handle(new Request("http://localhost/v2/health"))).json();
    const second = await (
      await fresh.handle(
        new Request("http://localhost/v2/health", { headers: { "cf-connecting-ip": "1.1.1.1" } }),
      )
    ).json();
    expect(first).toMatchObject({ ok: true, version: "2.0.0-next", time: now.toISOString() });
    expect(first.runtime).toStartWith("bun ");
    expect([first.coldStart, second.coldStart]).toEqual([true, false]);
    expect([first.ipHeader, second.ipHeader]).toEqual([null, "cf-connecting-ip"]);
    expect(first.geo.city).toEndWith("GeoIP2-City-Test.mmdb");
  });
});

describe("errors", () => {
  test("an unknown route answers 404 in the error envelope", async () => {
    const response = await api.handle(new Request("http://localhost/v2/nope"));
    expect(response.status).toBe(404);
    expect((await response.json()).error).toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("GET /v2/openapi/json", () => {
  test("documents ingest with its responses and the envelope schema", async () => {
    const document = await (
      await api.handle(new Request("http://localhost/v2/openapi/json"))
    ).json();
    expect(Object.keys(document.paths).sort()).toEqual([
      "/v2/auth/session",
      "/v2/events",
      "/v2/health",
      "/v2/projects",
      "/v2/projects/{project}",
      "/v2/projects/{project}/breakdown/{dimension}",
      "/v2/projects/{project}/events",
      "/v2/projects/{project}/keys",
      "/v2/projects/{project}/realtime",
      "/v2/projects/{project}/sessions",
      "/v2/projects/{project}/sessions/{session}/events",
      "/v2/projects/{project}/stats",
      "/v2/projects/{project}/timeseries",
      "/v2/projects/{project}/visitors",
      "/v2/projects/{project}/visitors/{visitor}",
      "/v2/projects/{project}/visitors/{visitor}/visits",
      "/v2/tokens",
      "/v2/tokens/{token}",
    ]);
    const ingest = document.paths["/v2/events"].post;
    expect(Object.keys(ingest.responses).sort()).toEqual([
      "202",
      "400",
      "401",
      "403",
      "413",
      "429",
      "500",
      "503",
    ]);
    expect(Object.keys(ingest.requestBody.content["text/plain"].schema.properties)).toEqual([
      "v",
      "sentAt",
      "events",
    ]);
    expect(document.components.schemas.WireEvent.properties.visitor).toBeDefined();
  });
});
