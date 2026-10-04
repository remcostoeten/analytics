import { beforeAll, describe, expect, test } from "bun:test";

import { PGlite } from "@electric-sql/pglite";
import {
  AlertDeliveryList,
  AlertsStatus,
  AlertTargetList,
  JobResult,
  RotatedSecret,
  TargetChangesResponse,
  TargetTest,
} from "@spoar/contract";
import type { WebhookBody } from "@spoar/contract";
import { createEngine, engineError } from "@spoar/engine";
import { fixedClock, memoryLogger } from "@spoar/engine/adapters/memory";
import { pgliteAccess, pgliteAdapters } from "@spoar/engine/adapters/pglite";
import { webCryptoHasher } from "@spoar/engine/adapters/system";
import { alerts, apiLinks, discord, mail, signBody, webhook } from "@spoar/engine/alerts";
import type { AlertsPlugin, MailMessage, MailTransport } from "@spoar/engine/alerts";
import { runMigrations } from "@spoar/engine/db/migrate";
import { migrationsDirectory, readMigrations } from "@spoar/engine/db/migration-files";
import { err, ok } from "@spoar/shared/result";
import type { Nullable } from "@spoar/shared/semantic";
import type { TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

import { createApp } from "../src/app";
import { openGeo } from "../src/geo";

type Json = { [key: string]: unknown };
type Headers = { [name: string]: string };

const now = new Date("2026-09-29T12:00:00.000Z");
const clock = fixedClock(now);
const database = new PGlite();
const hasher = webCryptoHasher();
const geo = openGeo([], []);
const stores = pgliteAccess(database);
const admin = { authorization: "Bearer at_test_admin" };
const reader = { authorization: "Bearer at_test_reader" };
const cron = { authorization: "Bearer cron-secret-for-tests" };
const links = apiLinks("https://api.example.test");
const sentMail: MailMessage[] = [];
const hookCalls: { url: string; init: RequestInit }[] = [];
const chatCalls: { url: string; init: RequestInit }[] = [];
let mailFailure: Nullable<string> = null;
let hookStatus = 200;

const transport: MailTransport = {
  name: "smtp",
  host: "smtp.example.test",
  ready: () => ok(null),
  send: async (message) => {
    if (mailFailure) return err(engineError("UNAVAILABLE", mailFailure));
    sentMail.push(message);
    return ok(null);
  },
};

async function hookFetch(url: string, init: RequestInit) {
  hookCalls.push({ url, init });
  return new Response("{}", { status: hookStatus });
}

async function chatFetch(url: string, init: RequestInit) {
  chatCalls.push({ url, init });
  return new Response(null, { status: 204 });
}

const everyChannel = alerts({
  channels: [
    mail({ transport, from: "Analytics <remco@gmail.com>" }),
    webhook({ fetch: hookFetch }),
    discord({ fetch: chatFetch }),
  ],
});

function build(plugin: Nullable<AlertsPlugin>) {
  return createApp({
    engine: (logger) =>
      createEngine(
        { ...pgliteAdapters(database, clock), geo: geo.lookup, hasher, clock, logger },
        { stages: [], signals: [], enrichers: [], dimensions: [] },
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
    ops: stores.ops,
    alerts: plugin ? { plugin, store: stores.alerts, links } : null,
  });
}

const api = build(everyChannel);
const webhookOnly = build(alerts({ channels: [webhook({ fetch: hookFetch })] }));
const alertsOff = build(null);

function send(path: string, method: string, headers: Headers = admin, payload?: Json, app = api) {
  return app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: payload ? { ...headers, "content-type": "application/json" } : headers,
      body: payload ? JSON.stringify(payload) : undefined,
    }),
  );
}

async function checked(response: Response, schema: TSchema, status = 200) {
  const json: unknown = await response.json();
  expect(response.status).toBe(status);
  if (!Value.Check(schema, json)) {
    const [first] = Value.Errors(schema, json);
    throw new Error(`the answer does not match its schema: ${first?.path} ${first?.message}`);
  }
  return json as Json;
}

async function fieldPaths(response: Response) {
  const json = (await response.json()) as {
    error: {
      code: string;
      message: string;
      details?: { fields?: { path: string; message: string }[] };
    };
  };
  return {
    code: json.error.code,
    message: json.error.message,
    paths: (json.error.details?.fields ?? []).map((field) => field.path),
    messages: (json.error.details?.fields ?? []).map((field) => field.message),
  };
}

const targets = "/v2/projects/alpha/alerts/targets";

function bodyText(init: RequestInit | undefined) {
  return typeof init?.body === "string" ? init.body : "";
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
    `INSERT INTO projects (id, name, domain, visibility, public_key, secret_key_hash, allowed_origins) VALUES
      ('alpha', 'alpha', 'alpha.test', 'public', 'pk_test_alpha', 'x', '{https://alpha.test}')`,
  );
  await database.query(
    "INSERT INTO api_tokens (id, name, token_hash, scope, project_ids) VALUES ('tok_admin', 'admin', $1, 'admin', NULL), ('tok_reader', 'reader', $2, 'read', NULL)",
    [await hasher.sha256("at_test_admin"), await hasher.sha256("at_test_reader")],
  );
});

describe("alert targets", () => {
  test("need a project admin", async () => {
    expect((await send(targets, "GET", {})).status).toBe(401);
    expect((await send(targets, "GET", reader)).status).toBe(403);
  });

  test("a wrong field answers VALIDATION_FAILED with its path", async () => {
    const email = await fieldPaths(
      await send(targets, "PUT", admin, { targets: [{ channel: "mail", to: ["remco"] }] }),
    );
    expect(email.code).toBe("VALIDATION_FAILED");
    expect(email.paths).toContain("/targets/0/to/0");
    const url = await fieldPaths(
      await send(targets, "PUT", admin, {
        targets: [{ channel: "webhook", url: "http://ops.example.com/hook" }],
      }),
    );
    expect(url.paths).toContain("/targets/0/url");
    const twice = await fieldPaths(
      await send(targets, "PUT", admin, {
        targets: [
          { channel: "webhook", name: "ops", url: "https://ops.example.com/hook" },
          { channel: "discord", name: "ops", url: "https://discord.com/api/webhooks/1/a" },
        ],
      }),
    );
    expect(twice).toMatchObject({ code: "VALIDATION_FAILED", paths: ["/targets/1/name"] });
  });

  test("a channel the deployment does not enable is refused", async () => {
    const refused = await fieldPaths(
      await send(
        targets,
        "PUT",
        admin,
        { targets: [{ channel: "mail", to: ["remco@gmail.com"] }] },
        webhookOnly,
      ),
    );
    expect(refused).toMatchObject({
      code: "VALIDATION_FAILED",
      paths: ["/targets/0/channel"],
      messages: ["mail is not enabled on this deployment"],
    });
  });

  test("sync creates, then changes nothing the second time", async () => {
    const list = {
      targets: [
        { channel: "mail", to: ["remco@gmail.com"] },
        { channel: "webhook", name: "ops", url: "https://ops.example.com/hooks/analytics" },
        {
          channel: "discord",
          url: "https://discord.com/api/webhooks/1/abc",
          on: ["issue.regression"],
        },
      ],
    };
    const first = await checked(await send(targets, "PUT", admin, list), TargetChangesResponse);
    const changes = first.data as { created: string[]; secrets: { [name: string]: string } };
    expect(changes.created).toEqual(["mail", "ops", "discord"]);
    expect(Object.keys(changes.secrets)).toEqual(["ops"]);
    expect(changes.secrets.ops).toStartWith("whsec_");
    const second = await checked(await send(targets, "PUT", admin, list), TargetChangesResponse);
    expect(second.data).toEqual({ created: [], updated: [], removed: [], secrets: {} });
    const listed = await checked(await send(targets, "GET"), AlertTargetList);
    expect(
      (listed.data as Json[]).map((target) => [
        target.name,
        target.channel,
        target.state,
        target.on,
      ]),
    ).toEqual([
      ["discord", "discord", "active", ["issue.regression"]],
      ["mail", "mail", "active", ["issue.new", "issue.regression"]],
      ["ops", "webhook", "active", ["issue.new", "issue.regression"]],
    ]);
  });

  test("set, test, rotate and remove one target", async () => {
    const set = await checked(
      await send(`${targets}/spare`, "PUT", admin, {
        channel: "mail",
        to: ["spare@example.com"],
        enabled: false,
      }),
      TargetChangesResponse,
    );
    expect(set.data).toMatchObject({ created: ["spare"] });
    const mismatch = await fieldPaths(
      await send(`${targets}/spare`, "PUT", admin, {
        channel: "mail",
        name: "other",
        to: ["a@b.co"],
      }),
    );
    expect(mismatch.paths).toEqual(["/name"]);
    const tested = await checked(await send(`${targets}/mail/test`, "POST"), TargetTest);
    expect(tested.data).toEqual({
      name: "mail",
      channel: "mail",
      delivered: true,
      message: "The sample alert was sent",
    });
    expect(sentMail.at(-1)?.subject).toBe("[alpha] 1 new issue");
    mailFailure = "SMTP smtp.gmail.com: AUTH answered 535 5.7.8 Username and Password not accepted";
    const failed = await checked(await send(`${targets}/mail/test`, "POST"), TargetTest);
    expect(failed.data).toMatchObject({ delivered: false, message: mailFailure });
    mailFailure = null;
    const rotated = await checked(await send(`${targets}/ops/rotate`, "POST"), RotatedSecret);
    expect((rotated.data as Json).secret).toStartWith("whsec_");
    expect((await send(`${targets}/mail/rotate`, "POST")).status).toBe(400);
    expect((await send(`${targets}/spare`, "DELETE")).status).toBe(204);
    expect((await send(`${targets}/spare`, "DELETE")).status).toBe(404);
    expect((await send(`${targets}/nope/test`, "POST")).status).toBe(404);
    sentMail.length = 0;
  });
});

describe("POST /v2/admin/jobs/alerts", () => {
  test("needs the cron secret", async () => {
    expect((await send("/v2/admin/jobs/alerts", "POST", {})).status).toBe(401);
  });

  test("sends one batch to each target, retries a failing one and holds back no other", async () => {
    await database.query(
      `INSERT INTO issues (project_id, fingerprint, title, culprit, count, visitors, first_seen, last_seen, last_release)
        VALUES ('alpha', 'f1', 'TypeError: x is undefined', 'app/page.tsx', 3, 1, $1, $1, '1.4.2')`,
      [now.toISOString()],
    );
    hookStatus = 502;
    const first = await checked(await send("/v2/admin/jobs/alerts", "POST", cron), JobResult);
    expect(first.data).toMatchObject({ job: "alerts", status: "ok", rowsWritten: 1 });
    expect(sentMail).toHaveLength(1);
    expect(sentMail[0]?.subject).toBe("[alpha] 1 new issue");
    expect(hookCalls).toHaveLength(1);
    expect(chatCalls).toHaveLength(0);

    const pending = await checked(
      await send("/v2/projects/alpha/alerts/deliveries?status=pending", "GET"),
      AlertDeliveryList,
    );
    expect(pending.data).toEqual([
      expect.objectContaining({
        target: "ops",
        event: "issue.new",
        attempts: 1,
        nextAttemptAt: "2026-09-29T12:01:00.000Z",
        lastError: expect.stringContaining("answered 502"),
      }),
    ]);
    const status = await checked(await send("/v2/admin/alerts/status", "GET"), AlertsStatus);
    expect(status.data).toEqual({
      channels: [
        { name: "mail", ready: true, problem: null },
        { name: "webhook", ready: true, problem: null },
        { name: "discord", ready: true, problem: null },
      ],
      transport: { name: "smtp", host: "smtp.example.test", from: "Analytics <remco@gmail.com>" },
      pending: 1,
      failing: [
        {
          project: "alpha",
          name: "ops",
          channel: "webhook",
          reason: expect.stringContaining("502"),
        },
      ],
    });

    hookStatus = 200;
    clock.now = () => new Date("2026-09-29T12:01:00.000Z");
    const second = await checked(await send("/v2/admin/jobs/alerts", "POST", cron), JobResult);
    expect(second.data).toMatchObject({ rowsWritten: 1 });
    const call = hookCalls.at(-1);
    if (!call) throw new Error("no webhook call");
    const headers = new Headers(call.init.headers);
    const body = bodyText(call.init);
    const secret = await database.query<{ webhook_secret: string }>(
      "SELECT webhook_secret FROM alert_targets WHERE name = 'ops'",
    );
    expect(headers.get("x-analytics-signature")).toBe(
      await signBody(
        body,
        secret.rows[0]?.webhook_secret ?? "",
        Number(headers.get("x-analytics-timestamp")),
      ),
    );
    const parsed: WebhookBody = JSON.parse(body);
    expect(parsed.events[0]).toMatchObject({
      name: "issue.new",
      project: "alpha",
      issue: {
        title: "TypeError: x is undefined",
        url: expect.stringMatching(
          /^https:\/\/api\.example\.test\/v2\/projects\/alpha\/issues\/iss_\d+$/,
        ),
      },
    });
    const sent = await checked(
      await send("/v2/projects/alpha/alerts/deliveries?status=sent&limit=10", "GET"),
      AlertDeliveryList,
    );
    expect(
      (sent.data as Json[])
        .map((delivery) => String(delivery.target))
        .sort((a, b) => a.localeCompare(b)),
    ).toEqual(["mail", "ops"]);
  });

  test("a regression reaches the Discord target", async () => {
    await database.query(
      "UPDATE issues SET is_regression = true, regressed_at = now() + interval '1 minute' WHERE fingerprint = 'f1'",
    );
    const run = await checked(await send("/v2/admin/jobs/alerts", "POST", cron), JobResult);
    expect(run.data).toMatchObject({ rowsWritten: 3 });
    expect(chatCalls).toHaveLength(1);
    expect(JSON.parse(bodyText(chatCalls[0]?.init))).toMatchObject({
      content: "[alpha] 1 regression",
      allowed_mentions: { parse: [] },
    });
  });
});

describe("a config without alerts()", () => {
  test("has none of the alert routes, and the job reports that alerts are off", async () => {
    expect((await send(targets, "GET", admin, undefined, alertsOff)).status).toBe(404);
    expect((await send("/v2/admin/alerts/status", "GET", admin, undefined, alertsOff)).status).toBe(
      404,
    );
    const job = await send("/v2/admin/jobs/alerts", "POST", cron, undefined, alertsOff);
    expect(job.status).toBe(503);
    expect(((await job.json()) as { error: { message: string } }).error.message).toBe(
      "Alerts are off: alerts() is not in analytics.config.ts",
    );
  });
});
