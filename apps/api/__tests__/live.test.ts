import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { PGlite } from "@electric-sql/pglite";
import { LiveServerMessage } from "@spoar/contract";
import { createEngine, defaultEnrichers, defaultSignals, defaultStages } from "@spoar/engine";
import { fixedClock, memoryLogger } from "@spoar/engine/adapters/memory";
import { pgliteAccess, pgliteAdapters } from "@spoar/engine/adapters/pglite";
import { webCryptoHasher } from "@spoar/engine/adapters/system";
import { runMigrations } from "@spoar/engine/db/migrate";
import { migrationsDirectory, readMigrations } from "@spoar/engine/db/migration-files";
import { Value } from "@sinclair/typebox/value";

import { createApp } from "../src/app";
import { openGeo } from "../src/geo";

type Message = LiveServerMessage;

const now = new Date(Math.floor(Date.now() / 1000) * 1000);
const clock = fixedClock(now);
const database = new PGlite();
const hasher = webCryptoHasher();
const geo = openGeo([], []);
const stores = pgliteAccess(database);
const adapters = pgliteAdapters(database, clock);
const site = "https://live.example";
const project = "live";
const chrome =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

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
  access: {
    ...stores,
    sessions: async () => null,
    hasher,
    clock: () => clock.now(),
    cronSecret: null,
  },
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
  widget: {
    store: stores.widget,
    logs: stores.logs,
    keys: adapters.projects,
    limiter: adapters.limiter,
    reportsPerMinute: 1000,
  },
  live: { snapshotMs: 50, retryMs: 50, authMs: 300 },
});

let host = "";

type Outgoing = { [field: string]: string };

type Socket = {
  socket: WebSocket;
  messages: Message[];
  closed: Promise<{ code: number; reason: string }>;
  send: (value: Outgoing) => void;
  next: (type: Message["type"]) => Promise<Message>;
};

function open(): Promise<Socket> {
  const socket = new WebSocket(`ws://${host}/v2/projects/${project}/live`);
  const messages: Message[] = [];
  const waiting: { type: Message["type"]; resolve: (message: Message) => void }[] = [];
  socket.addEventListener("message", (event) => {
    const parsed: unknown = JSON.parse(String(event.data));
    if (!Value.Check(LiveServerMessage, parsed))
      throw new Error(`Not a live message: ${String(event.data)}`);
    const index = waiting.findIndex((entry) => entry.type === parsed.type);
    if (index >= 0) waiting.splice(index, 1)[0]?.resolve(parsed);
    else messages.push(parsed);
  });
  const closed = new Promise<{ code: number; reason: string }>((resolve) =>
    socket.addEventListener("close", (event) =>
      resolve({ code: event.code, reason: event.reason }),
    ),
  );
  function next(type: Message["type"]) {
    const seen = messages.findIndex((message) => message.type === type);
    if (seen >= 0) return Promise.resolve(messages.splice(seen, 1)[0] as Message);
    return new Promise<Message>((resolve, reject) => {
      waiting.push({ type, resolve });
      setTimeout(() => reject(new Error(`No ${type} message`)), 3000);
    });
  }
  return new Promise((resolve) =>
    socket.addEventListener("open", () =>
      resolve({
        socket,
        messages,
        closed,
        send: (value) => socket.send(JSON.stringify(value)),
        next,
      }),
    ),
  );
}

function ingest(id: string, path: string) {
  return fetch(`http://${host}/v2/events`, {
    method: "POST",
    headers: {
      "content-type": "text/plain;charset=UTF-8",
      origin: site,
      "user-agent": chrome,
      "sec-ch-ua": '"Chromium";v="140"',
      "sec-fetch-mode": "no-cors",
      "accept-language": "nl-NL",
      "x-project-key": "pk_test_live",
    },
    body: JSON.stringify({
      v: 1,
      sentAt: now.toISOString(),
      events: [
        {
          id,
          name: "pageview",
          ts: now.toISOString(),
          visitor: "8c4e1f0a-2b3c-4d5e-8f60-718293a4b5c6",
          session: "f1a2b3c4-d5e6-4f70-8a91-b2c3d4e5f607",
          page: { path },
          props: {},
          signals: 0,
        },
      ],
    }),
  });
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
    `INSERT INTO projects (id, name, domain, visibility, allowed_origins, public_key, secret_key_hash)
     VALUES ($1, 'Live', 'live.example', 'private', $2, 'pk_test_live', 'x')`,
    [project, [site]],
  );
  await database.query(
    `INSERT INTO api_tokens (id, name, token_hash, scope, project_ids, kind, expires_at) VALUES
       ('tok_read', 'read', $1, 'read', NULL, 'api', NULL),
       ('tok_widget', 'widget', $2, 'admin', ARRAY['live'], 'widget', $3),
       ('tok_short', 'widget', $4, 'admin', ARRAY['live'], 'widget', $5)`,
    [
      await hasher.sha256("at_test_read"),
      await hasher.sha256("wt_test_widget"),
      new Date(now.getTime() + 15 * 60_000).toISOString(),
      await hasher.sha256("wt_test_short"),
      new Date(now.getTime() + 300).toISOString(),
    ],
  );
  api.listen(0);
  host = `localhost:${api.server?.port ?? 0}`;
  await ingest("01928c3e-0000-7000-8000-000000000001", "/");
}, 20_000);

afterAll(() => {
  void api.stop(true);
});

describe("GET /v2/projects/:project/live", () => {
  test("refuses subscriptions before auth and closes when auth never comes", async () => {
    const live = await open();
    live.send({ type: "subscribe", channel: "events" });
    expect(await live.next("error")).toMatchObject({ code: "UNAUTHORIZED", channel: "events" });
    expect((await live.closed).code).toBe(4401);
  });

  test("a bad token answers an error and closes with 4401", async () => {
    const live = await open();
    live.send({ type: "auth", token: "at_wrong" });
    expect(await live.next("error")).toMatchObject({ code: "UNAUTHORIZED" });
    expect((await live.closed).code).toBe(4401);
  });

  test("a read token gets events, visitors and sessions but not logs", async () => {
    const live = await open();
    live.send({ type: "auth", token: "at_test_read" });
    expect(await live.next("ready")).toEqual({
      type: "ready",
      project,
      channels: ["events", "visitors", "sessions"],
      expiresAt: null,
    });
    live.send({ type: "subscribe", channel: "logs" });
    expect(await live.next("error")).toMatchObject({ code: "FORBIDDEN", channel: "logs" });
    live.send({ type: "ping" });
    expect(await live.next("pong")).toEqual({ type: "pong" });
    live.send({ type: "nonsense" });
    expect(await live.next("error")).toMatchObject({ code: "VALIDATION_FAILED" });
    live.socket.close();
  });

  test("events arrive as they are stored, and sessions as snapshots", async () => {
    const live = await open();
    live.send({ type: "auth", token: "wt_test_widget" });
    const ready = await live.next("ready");
    expect(ready).toMatchObject({
      channels: ["events", "visitors", "sessions", "logs"],
      expiresAt: new Date(now.getTime() + 15 * 60_000).toISOString(),
    });
    live.send({ type: "subscribe", channel: "events" });
    await live.next("subscribed");
    const first = await live.next("events");
    expect(first.type === "events" && first.data.map((event) => event.path)).toEqual(["/"]);
    live.send({ type: "subscribe", channel: "sessions" });
    const sessions = await live.next("sessions");
    expect(sessions.type === "sessions" && sessions.data[0]?.trail).toEqual(["/"]);
    await ingest("01928c3e-0000-7000-8000-000000000002", "/pricing");
    const next = await live.next("events");
    expect(next.type === "events" && next.data.map((event) => [event.path, event.visitor])).toEqual(
      [["/pricing", "8c4e1f0a-2b3c-4d5e-8f60-718293a4b5c6"]],
    );
    const changed = await live.next("sessions");
    expect(changed.type === "sessions" && changed.data[0]?.trail).toEqual(["/", "/pricing"]);
    live.socket.close();
  });

  test("logs resume from a cursor", async () => {
    const live = await open();
    live.send({ type: "auth", token: "wt_test_widget" });
    await live.next("ready");
    live.send({ type: "subscribe", channel: "logs", after: "1" });
    await live.next("subscribed");
    const missed = await live.next("logs");
    expect(missed.type === "logs" && missed.data.every((line) => Number(line.id) > 1)).toBe(true);
    live.socket.close();
  });

  test("closes with 4001 when the token expires", async () => {
    const live = await open();
    live.send({ type: "auth", token: "wt_test_short" });
    await live.next("ready");
    expect((await live.closed).code).toBe(4001);
  });

  test("HTTP routes keep working next to the socket", async () => {
    const response = await fetch(`http://${host}/v2/health`);
    expect(response.status).toBe(200);
  });
});
