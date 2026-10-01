import { beforeAll, describe, expect, test } from "bun:test";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

import { emptyRecord, fixedClock, memoryGeo, memoryLogger } from "../src/adapters/memory";
import { pgliteAdapters } from "../src/adapters/pglite";
import { webCryptoHasher } from "../src/adapters/system";
import { runMigrations } from "../src/db/migrate";
import { migrationsDirectory, readMigrations } from "../src/db/migration-files";
import { defaultEnrichers } from "../src/enrichers";
import { rescoreEvents, scoreSessions, syncSessionScores } from "../src/jobs";
import { createEngine } from "../src/pipeline";
import { defaultSignals } from "../src/signals";
import { uaCrawler } from "../src/signals/ua-crawler";
import { defaultStages } from "../src/stages";
import { browserEvents, now, project, settings } from "./batch";
import { createClient } from "./pglite-client";
import { agents, browserHeaders } from "./requests";

type Case = {
  name: string;
  headers: { [name: string]: string };
  ip?: string;
  signals?: number;
  bot: boolean;
};

type Row = { session_id: string; bot_score: number; bot_reasons: string[]; device_type: string };

const datacenter = "3.5.140.2";
const database = new PGlite();
const db = drizzle(database);
const clock = fixedClock(now);
const geo = memoryGeo(
  new Map([[datacenter, { ...emptyRecord, network: { asn: 16509, asOrg: "AMAZON-02" } }]]),
);

function engine(signals = defaultSignals) {
  return createEngine(
    {
      ...pgliteAdapters(database, clock),
      geo,
      hasher: webCryptoHasher(),
      clock,
      logger: memoryLogger(),
    },
    { stages: defaultStages, signals, enrichers: defaultEnrichers, dimensions: [] },
    { ...settings, rateLimit: { limit: 10_000, windowSeconds: 60 } },
  );
}

let sequence = 0;

function uuid() {
  sequence += 1;
  return `01928c3e-7a4b-7c1d-9f00-${sequence.toString(16).padStart(12, "0")}`;
}

function event(session: string, visitor: string, offsetMs: number, signals = 0) {
  const [pageview] = browserEvents();
  return {
    ...pageview,
    id: uuid(),
    session,
    visitor,
    signals,
    ts: new Date(now.getTime() - 60_000 + offsetMs).toISOString(),
  };
}

const secretKey = "sk_bot_detection";

async function send(
  headers: { [name: string]: string },
  events: unknown[],
  ip = "81.2.69.160",
  run = engine(),
  trusted = false,
) {
  const result = await run.ingest({
    credentials: trusted
      ? { publicKey: null, secretKey }
      : { publicKey: project.publicKey, secretKey: null },
    receivedAt: now.toISOString(),
    sentAt: now.toISOString(),
    request: {
      headers: new Headers({
        origin: "https://remcostoeten.nl",
        "x-forwarded-for": ip,
        ...headers,
      }),
      adminSession: false,
    },
    events,
  });
  if (!result.ok || result.value.rejected.length > 0) throw new Error(JSON.stringify(result));
}

async function session(id: string) {
  const result = await database.query<Row>(
    "SELECT session_id, bot_score, bot_reasons, device_type FROM events WHERE session_id = $1 ORDER BY ts",
    [id],
  );
  return result.rows;
}

beforeAll(async () => {
  const report = await runMigrations(createClient(database), readMigrations(migrationsDirectory), {
    dryRun: false,
    baseline: null,
  });
  if (!report.ok) throw new Error(report.error.message);
  await database.query(
    "INSERT INTO projects (id, name, domain, public_key, secret_key_hash) VALUES ($1, $1, $1, $2, $3)",
    [project.id, project.publicKey, await webCryptoHasher().sha256(secretKey)],
  );
});

describe("fixture requests land on the expected side of 50", () => {
  const cases: Case[] = [
    { name: "Googlebot", headers: { "user-agent": agents.googlebot }, bot: true },
    {
      name: "GPTBot",
      headers: { "user-agent": agents.gptbot, "accept-language": "en" },
      bot: true,
    },
    { name: "curl", headers: { "user-agent": agents.curl }, bot: true },
    { name: "python-requests", headers: { "user-agent": agents.requests }, bot: true },
    {
      name: "HeadlessChrome",
      headers: { ...browserHeaders.chrome, "user-agent": agents.headless },
      bot: true,
    },
    {
      name: "Playwright Chromium with webdriver",
      headers: browserHeaders.chrome,
      signals: 1,
      bot: true,
    },
    {
      name: "a bare Chrome user agent (45)",
      headers: { "user-agent": agents.chrome },
      bot: false,
    },
    { name: "a datacenter ASN alone", headers: browserHeaders.chrome, ip: datacenter, bot: false },
    {
      name: "a datacenter ASN without accept-language",
      headers: { ...browserHeaders.chrome, "accept-language": "" },
      ip: datacenter,
      bot: true,
    },
    { name: "Chrome", headers: browserHeaders.chrome, bot: false },
    { name: "Brave", headers: browserHeaders.brave, bot: false },
    { name: "Firefox", headers: browserHeaders.firefox, bot: false },
    { name: "Safari", headers: browserHeaders.safari, bot: false },
  ];

  test.each(cases)("$name", async ({ name, headers, ip, signals, bot }) => {
    const id = `fixture-${name}`;
    await send(headers, [event(id, id, 0, signals)], ip);
    const [row] = await session(id);
    expect((row?.bot_score ?? 0) >= 50).toBe(bot);
    expect(row?.device_type === "bot").toBe(bot);
  });
});

describe("secret-key requests without forwarded visitor details", () => {
  test("are neutral: the server's own IP and user agent add no weight", async () => {
    await send(
      { "user-agent": agents.curl },
      [event("server-sent", "server-sent", 0)],
      datacenter,
      engine(),
      true,
    );
    const [row] = await session("server-sent");
    expect(row).toMatchObject({ bot_score: 0, bot_reasons: [] });
    const stored = await database.query<{ ip_hash: string | null; asn: number | null }>(
      "SELECT ip_hash, asn FROM events WHERE session_id = 'server-sent'",
    );
    expect(stored.rows).toEqual([{ ip_hash: null, asn: null }]);
  });

  test("still score the visitor details they forward", async () => {
    await send(
      { "user-agent": "node", "x-visitor-ua": agents.curl, "x-visitor-ip": datacenter },
      [event("server-forwarded", "server-forwarded", 0)],
      "81.2.69.160",
      engine(),
      true,
    );
    const [row] = await session("server-forwarded");
    expect(row?.bot_reasons).toEqual(["ua_automation", "asn_datacenter"]);
  });
});

describe("session job", () => {
  const range = { from: new Date(now.getTime() - 3_600_000), to: new Date(now.getTime() + 1) };

  test("marks a session with more than 30 pageviews a minute, once", async () => {
    await send(
      browserHeaders.chrome,
      Array.from({ length: 12 }, (_, index) => event("session-fast", "visitor-fast", index * 700)),
    );
    await send(
      browserHeaders.chrome,
      Array.from({ length: 3 }, (_, index) =>
        event("session-slow", "visitor-slow", index * 17_000 + index * 311),
      ),
    );
    expect(await scoreSessions(db, range, true)).toEqual({ velocity: 12, fanout: 0 });
    expect(await scoreSessions(db, range, false)).toEqual({ velocity: 12, fanout: 0 });
    expect(await scoreSessions(db, range, false)).toEqual({ velocity: 0, fanout: 0 });

    const fast = await session("session-fast");
    expect(fast.every((row) => row.bot_reasons.includes("session_velocity"))).toBe(true);
    expect(fast[0]?.bot_score).toBe(50);
    const slow = await session("session-slow");
    expect(slow.map((row) => row.bot_score)).toEqual([0, 0, 0]);
    const sessions = await database.query<{ bot_score: number }>(
      "SELECT bot_score FROM sessions WHERE session_id = 'session-fast'",
    );
    expect(sessions.rows).toEqual([{ bot_score: 50 }]);
  });

  test("marks every event from an IP hash with more than 20 visitors in a day", async () => {
    for (let visitor = 0; visitor < 21; visitor += 1) {
      await send(
        browserHeaders.firefox,
        [event(`fanout-${visitor}`, `fanout-visitor-${visitor}`, visitor * 1000)],
        "2.125.160.216",
      );
    }
    const lastVisitor = new Date(now.getTime() - 60_000 + 20_000);
    const partial = { from: lastVisitor, to: range.to };
    expect(await scoreSessions(db, partial, true)).toEqual({ velocity: 0, fanout: 1 });
    expect(await scoreSessions(db, range, false)).toEqual({ velocity: 0, fanout: 21 });
    const [row] = await session("fanout-0");
    expect(row?.bot_reasons).toEqual(["ip_fanout"]);
    expect(row?.bot_score).toBe(40);
  });

  test("lowers a session's score when its events score lower", async () => {
    await database.query("UPDATE sessions SET bot_score = 90 WHERE session_id = 'session-slow'");
    await syncSessionScores(db, range);
    const sessions = await database.query<{ bot_score: number }>(
      "SELECT bot_score FROM sessions WHERE session_id = 'session-slow'",
    );
    expect(sessions.rows).toEqual([{ bot_score: 0 }]);
  });
});

describe("rescoreEvents", () => {
  const range = { from: new Date(now.getTime() - 3_600_000), to: new Date(now.getTime() + 1) };

  test("reruns stored-input signals and keeps the other reasons", async () => {
    const onlyCrawlers = engine([uaCrawler]);
    await send(
      { "user-agent": agents.curl },
      [event("rescore-curl", "rescore-curl", 0)],
      undefined,
      onlyCrawlers,
    );
    expect((await session("rescore-curl"))[0]?.bot_score).toBe(0);

    const dry = await rescoreEvents(db, defaultSignals, {
      ...range,
      dryRun: true,
      includeLegacy: false,
    });
    expect(dry.changed).toBeGreaterThan(0);
    expect((await session("rescore-curl"))[0]?.bot_score).toBe(0);

    const report = await rescoreEvents(db, defaultSignals, {
      ...range,
      dryRun: false,
      includeLegacy: false,
    });
    expect(report.changed).toBe(dry.changed);
    expect(await session("rescore-curl")).toEqual([
      {
        session_id: "rescore-curl",
        bot_score: 100,
        bot_reasons: ["ua_automation"],
        device_type: "bot",
      },
    ]);
    expect((await session("session-fast"))[0]?.bot_reasons).toEqual(["session_velocity"]);
    expect((await session("fanout-0"))[0]?.bot_reasons).toEqual(["ip_fanout"]);

    expect(
      await rescoreEvents(db, defaultSignals, { ...range, dryRun: false, includeLegacy: false }),
    ).toEqual({
      scanned: report.scanned,
      changed: 0,
    });
  });

  test("leaves v1 rows alone unless asked", async () => {
    await database.query(
      "INSERT INTO events (project_id, type, ts, ua, bot_score, bot_detected, schema_version, fingerprint) VALUES ($1, 'pageview', $2, $3, 100, true, 0, 'legacy-row')",
      [project.id, now, agents.chrome],
    );
    await rescoreEvents(db, defaultSignals, { ...range, dryRun: false, includeLegacy: false });
    const legacy = await database.query<{ bot_score: number }>(
      "SELECT bot_score FROM events WHERE fingerprint = 'legacy-row'",
    );
    expect(legacy.rows).toEqual([{ bot_score: 100 }]);
    await rescoreEvents(db, defaultSignals, { ...range, dryRun: false, includeLegacy: true });
    const rescored = await database.query<{ bot_score: number }>(
      "SELECT bot_score FROM events WHERE fingerprint = 'legacy-row'",
    );
    expect(rescored.rows).toEqual([{ bot_score: 0 }]);
  });
});
