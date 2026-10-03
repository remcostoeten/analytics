import { describe, expect, test } from "bun:test";

import { err, ok } from "@remcostoeten/analytics-shared/result";

import {
  fixedClock,
  memoryHasher,
  memoryLimiter,
  memoryLogs,
  memoryProjects,
} from "../src/adapters/memory";
import { engineError } from "../src/errors";
import { storeClientReports } from "../src/logs/client";
import { createEngine } from "../src/pipeline";
import type { IssueStore, NewLogLine, ReadStore, SpeedStore, WidgetStore } from "../src/ports";
import { defaultSignals } from "../src/signals";
import { botLabel } from "../src/signals/verdict";
import { defaultStages } from "../src/stages";
import { composeOverview } from "../src/widget/overview";
import { browserEvents, browserRequest, memoryPorts, now, project, settings } from "./batch";

const line: NewLogLine = {
  project: project.id,
  ts: now,
  level: "info",
  kind: "ingest",
  source: "api",
  message: "RA_INGEST_BATCH 2 accepted, 0 duplicates, 0 rejected",
  data: { code: "RA_INGEST_BATCH", accepted: 2, duplicates: 0, rejected: 0 },
  visitor: null,
  session: null,
};

const drop = {
  kind: "transport" as const,
  level: "warn" as const,
  message: "RA_DROP queue full, sent by 10.0.0.12",
  data: { events: 4, to: "someone@example.test" },
  ts: now.toISOString(),
};

describe("botLabel", () => {
  test("human below 25, suspect from 25, bot from 50", () => {
    expect([0, 24, 25, 49, 50, 100].map(botLabel)).toEqual([
      "human",
      "human",
      "suspect",
      "suspect",
      "bot",
      "bot",
    ]);
  });
});

describe("memoryLogs", () => {
  test("filters, pages after a cursor and sums the ingest lines", async () => {
    const logs = memoryLogs();
    await logs.write([
      line,
      {
        ...line,
        level: "warn",
        message: "RA_RATE_LIMITED retry after 4s",
        data: { code: "RA_RATE_LIMITED" },
      },
      { ...line, project: "other" },
    ]);
    const filter = {
      project: project.id,
      level: null,
      kind: null,
      source: null,
      visitor: null,
      search: null,
    };
    const all = await logs.next({ filter, after: null, limit: 100 }, { ms: 0, signal: null });
    expect(all.ok && all.value.lines.map((entry) => entry.id)).toEqual(["1", "2"]);
    const warned = await logs.next(
      { filter: { ...filter, level: "warn" }, after: null, limit: 100 },
      { ms: 0, signal: null },
    );
    expect(warned.ok && warned.value.lines.map((entry) => entry.id)).toEqual(["2"]);
    const after = await logs.next({ filter, after: "2", limit: 100 }, { ms: 0, signal: null });
    expect(after).toEqual(ok({ lines: [], cursor: "2" }));
    expect(await logs.ingestTotals(project.id, new Date(0))).toEqual(
      ok({ accepted: 2, duplicates: 0, rejected: 0, rateLimited: 1 }),
    );
  });
});

describe("ingest log lines", () => {
  test("one batch line, a line per rejected event and per suspect verdict, never prop values", async () => {
    const logs = memoryLogs();
    const engine = createEngine(
      { ...memoryPorts(), logs },
      { stages: defaultStages, signals: defaultSignals, enrichers: [], dimensions: [] },
      settings,
    );
    const [pageview, signup] = browserEvents();
    const request = browserRequest();
    await engine.ingest({
      ...request,
      events: [
        { ...pageview, signals: 2 },
        { ...signup, props: { plan: 42, secret: { nested: "hidden-value" } } },
      ],
    });
    const codes = logs.lines.map((entry) => entry.data.code);
    expect(codes).toEqual(["RA_INGEST_BATCH", "RA_INGEST_REJECTED", "RA_BOT_VERDICT"]);
    expect(logs.lines[0]?.data).toEqual({
      code: "RA_INGEST_BATCH",
      accepted: 1,
      duplicates: 0,
      rejected: 1,
    });
    expect(logs.lines[1]).toMatchObject({
      level: "error",
      kind: "ingest",
      data: { reason: "VALIDATION_FAILED", index: 1, event: "signup", field: "props" },
      visitor: signup?.visitor,
    });
    expect(logs.lines[2]).toMatchObject({ kind: "signals", source: "engine" });
    expect(JSON.stringify(logs.lines)).not.toContain("hidden-value");
  });

  test("a rate limited request writes a warn line", async () => {
    const logs = memoryLogs();
    const engine = createEngine(
      { ...memoryPorts(), logs },
      { stages: [], signals: [], enrichers: [], dimensions: [] },
      { ...settings, rateLimit: { limit: 0, windowSeconds: 60 } },
    );
    await engine.ingest(browserRequest());
    expect(logs.lines).toEqual([
      expect.objectContaining({
        level: "warn",
        kind: "ingest",
        data: expect.objectContaining({ code: "RA_RATE_LIMITED" }),
      }),
    ]);
  });
});

describe("storeClientReports", () => {
  function ports(widgetReports: boolean) {
    const clock = fixedClock(now);
    return {
      projects: memoryProjects([{ ...project, widgetReports }]),
      hasher: memoryHasher(),
      limiter: memoryLimiter(clock),
      logs: memoryLogs(),
      clock,
    };
  }

  const report = {
    project: project.id,
    credentials: { publicKey: project.publicKey, secretKey: null },
    origin: "https://remcostoeten.nl",
    logs: [drop],
  };
  const limit = { limit: 1, windowSeconds: 60 };

  test("is refused while widgetReports is off", async () => {
    const off = ports(false);
    expect(await storeClientReports(off, report, limit)).toEqual(
      err(engineError("WIDGET_REPORTS_DISABLED", "Client reports are off for this project")),
    );
    expect(off.logs.lines).toEqual([]);
  });

  test("stores sdk lines without email or IP addresses, rate limited per project", async () => {
    const on = ports(true);
    expect(await storeClientReports(on, report, limit)).toEqual(ok({ accepted: 1 }));
    expect(on.logs.lines[0]).toMatchObject({
      source: "sdk",
      kind: "transport",
      message: "RA_DROP queue full, sent by [redacted]",
      data: { events: 4, to: "[redacted]" },
    });
    const again = await storeClientReports(on, report, limit);
    expect(!again.ok && again.error.code).toBe("RATE_LIMITED");
  });

  test("refuses a key from another project", async () => {
    const result = await storeClientReports(ports(true), { ...report, project: "other" }, limit);
    expect(!result.ok && result.error.code).toBe("FORBIDDEN");
  });
});

describe("composeOverview", () => {
  const scopes: string[] = [];
  const reads: ReadStore = {
    headline: async (scope) => {
      scopes.push(scope.traffic);
      return ok({
        visitors: scope.traffic === "bots" ? 5 : 100,
        sessions: 120,
        pageviews: 300,
        pagesPerSession: 2.5,
        bounceRate: 0.4123,
        sessionDurationMs: 134_400,
      });
    },
    timeseries: async () => ok([]),
    breakdown: async (_, dimension) => {
      const rows: { [name: string]: { value: string; metrics: number[]; visitors: number }[] } = {
        page: [{ value: "/", metrics: [44], visitors: 30 }],
        referrer_domain: [{ value: "google.com", metrics: [48], visitors: 48 }],
        country: [{ value: "NL", metrics: [71], visitors: 71 }],
        bot_reason: [
          { value: "client_headless", metrics: [3], visitors: 3 },
          { value: "asn_datacenter", metrics: [14], visitors: 14 },
        ],
        event: [{ value: "error", metrics: [6], visitors: 2 }],
      };
      return ok({ rows: rows[dimension.name] ?? [], total: 1, scopeVisitors: 100 });
    },
    realtime: async () => ok({ visitors: 27, pageviews: 40, pages: [], countries: [] }),
    paths: async () => ok({ views: 0, dropOff: 0, steps: [] }),
    retention: async () => ok([]),
    lifecycle: async () => ok([]),
    stickiness: async () => ok([]),
    heatmap: async () => ok([]),
    places: async () => ok({ rows: [], total: 0, scopeVisitors: 0 }),
  };
  const speed: SpeedStore = {
    summary: async () =>
      ok([
        { metric: "lcp", samples: 50, value: 1400.4, good: 40, needsImprovement: 8, poor: 2 },
        { metric: "cls", samples: 50, value: 0.0213, good: 50, needsImprovement: 0, poor: 0 },
        { metric: "inp", samples: 3, value: 96, good: 3, needsImprovement: 0, poor: 0 },
      ]),
    series: async () => ok([]),
    routes: async () => ok([]),
    elements: async () => ok({ rows: [], total: 0 }),
    rollup: async () => ok({ rowsWritten: 0, rowsDeleted: 0 }),
  };
  const issues: IssueStore = {
    list: async () => ok({ rows: [], total: 12 }),
    get: async () => ok(null),
    events: async () => ok({ rows: [], total: 0 }),
    setStatus: async (issue) => ok(issue),
    ignores: async () => ok([]),
    muted: async () => ok([]),
    addIgnore: async () => err(engineError("INTERNAL", "unused")),
    removeIgnore: async () => ok(false),
    mute: async (issue) => ok(issue),
    pendingAlerts: async () => ok([]),
    markAlerted: async () => ok(null),
  };
  const widget: WidgetStore = {
    active: async () => ok([]),
    perMinute: async () => ok([3, 5, 4, 6, 5, 8, 7, 11, 9, 14]),
    release: async () =>
      ok({
        current: "2026.10.03-a1",
        deployedAt: new Date("2026-10-03T11:42:00.000Z"),
        newIssuesSince: 3,
      }),
  };

  test("composes every number from the existing reads", async () => {
    const logs = memoryLogs();
    await logs.write([line]);
    const overview = await composeOverview({ reads, speed, issues, logs, widget }, project.id, now);
    expect(overview).toEqual(
      ok({
        online: 27,
        viewsPerMinute: [3, 5, 4, 6, 5, 8, 7, 11, 9, 14],
        today: { visitors: 100, pageviews: 300, bounceRate: 0.412, avgSessionSeconds: 134 },
        ingest: { last24h: { accepted: 2, duplicates: 0, rejected: 0, rateLimited: 0 } },
        bots: { share: 0.05, headless: 3, webdriver: 0, datacenterAsn: 14 },
        speed: { lcp: 1400, inp: null, cls: 0.021, ttfb: null },
        errors: { last30m: 6, openIssues: 12 },
        topPages: [{ path: "/", views: 44 }],
        referrers: [{ name: "google.com", share: 0.48 }],
        countries: [{ code: "NL", share: 0.71 }],
        release: {
          current: "2026.10.03-a1",
          deployedAt: "2026-10-03T11:42:00.000Z",
          newIssuesSince: 3,
        },
      }),
    );
    expect(scopes).toEqual(["human", "all", "bots"]);
  });

  test("answers the first failing read's error", async () => {
    const failing = { ...widget, release: async () => err(engineError("UNAVAILABLE", "down")) };
    const overview = await composeOverview(
      { reads, speed, issues, logs: memoryLogs(), widget: failing },
      project.id,
      now,
    );
    expect(overview).toEqual(err(engineError("UNAVAILABLE", "down")));
  });
});
