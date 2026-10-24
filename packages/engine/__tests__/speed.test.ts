import { beforeAll, describe, expect, test } from "bun:test";

import { PGlite } from "@electric-sql/pglite";

import { drizzleDetails } from "../src/adapters/drizzle-details";
import { drizzleOps } from "../src/adapters/drizzle-ops";
import { drizzleSpeed } from "../src/adapters/drizzle-speed";
import { fixedClock, memoryGeo, memoryLogger } from "../src/adapters/memory";
import { pgliteAdapters } from "../src/adapters/pglite";
import { webCryptoHasher } from "../src/adapters/system";
import { runMigrations } from "../src/db/migrate";
import { migrationsDirectory, readMigrations } from "../src/db/migration-files";
import { defaultEnrichers } from "../src/enrichers";
import { createEngine } from "../src/pipeline";
import { syncSessionScores } from "../src/jobs";
import { defaultSignals } from "../src/signals";
import { experienceScore, metricScore, scoreRating, vitalRating } from "../src/speed/score";
import { defaultStages } from "../src/stages";
import { browserEvents, browserRequest, now, project, settings } from "./batch";
import { createClient } from "./pglite-client";
import { agents, browserHeaders } from "./requests";
import { drizzle } from "drizzle-orm/pglite";

const database = new PGlite();
const clock = fixedClock(now);
const engine = createEngine(
  {
    ...pgliteAdapters(database, clock),
    geo: memoryGeo(new Map()),
    hasher: webCryptoHasher(),
    clock,
    logger: memoryLogger(),
  },
  { stages: defaultStages, signals: defaultSignals, enrichers: defaultEnrichers, dimensions: [] },
  settings,
);
const speed = drizzleSpeed(drizzle(database));
const month = {
  projectIds: ["site"],
  from: new Date("2026-09-01T00:00:00Z"),
  to: new Date("2026-09-04T00:00:00Z"),
  device: "all" as const,
  environment: "production" as const,
  route: null,
  path: null,
  country: null,
  rawFrom: new Date("2026-08-29T00:00:00Z"),
};

let counter = 0;

function vital(props: { [key: string]: unknown }) {
  const [template] = browserEvents();
  if (!template) throw new Error("fixture has no events");
  counter += 1;
  return {
    ...template,
    id: `01928c3e-7a4b-7c1d-9f00-${counter.toString(16).padStart(12, "0")}`,
    name: "web_vital",
    props: { rating: "good", navigationType: "navigate", sampleRate: 1, ...props },
  };
}

function send(events: ReturnType<typeof vital>[], agent: { [name: string]: string }) {
  const request = browserRequest(agent);
  return engine.ingest({ ...request, events });
}

async function seed(
  rows: {
    metric: string;
    value: number;
    rating?: string;
    route?: string;
    device?: string;
    day?: string;
    hour?: string;
    selector?: string;
    path?: string;
    preview?: boolean;
  }[],
) {
  for (const [index, row] of rows.entries()) {
    await database.query(
      `INSERT INTO web_vitals (id, project_id, ts, metric, value, rating, route, path, device, selector, is_preview)
       VALUES ($1, 'site', $2, $3, $4, $5, $6, $9, $7, $8, $10)`,
      [
        `seed-${row.metric}-${index}-${row.value}-${row.preview ? "preview" : "production"}`,
        `${row.day ?? "2026-09-02"}T${row.hour ?? "10"}:00:00Z`,
        row.metric,
        row.value,
        row.rating ?? vitalRating(row.metric as "lcp", row.value),
        row.route ?? "/",
        row.device ?? "mobile",
        row.selector ?? null,
        row.path ?? row.route ?? "/",
        row.preview ?? false,
      ],
    );
  }
}

beforeAll(async () => {
  const report = await runMigrations(createClient(database), readMigrations(migrationsDirectory), {
    dryRun: false,
    baseline: null,
  });
  if (!report.ok) throw new Error(report.error.message);
  await database.query(
    "INSERT INTO projects (id, name, domain, allowed_origins, public_key, secret_key_hash) VALUES ($1, $1, $1, $2, $3, $4)",
    [project.id, project.allowedOrigins, project.publicKey, "unused"],
  );
});

describe("scores, against hand-computed values", () => {
  test("the good threshold scores 90 and the poor threshold 50", () => {
    expect(metricScore("lcp", 2500)).toBe(90);
    expect(metricScore("lcp", 4000)).toBe(50);
    expect(metricScore("inp", 200)).toBe(90);
    expect(metricScore("inp", 500)).toBe(50);
    expect(metricScore("cls", 0.1)).toBe(90);
    expect(metricScore("cls", 0.25)).toBe(50);
    expect(metricScore("fcp", 1800)).toBe(90);
    expect(metricScore("fcp", 3000)).toBe(50);
  });

  test("values between and beyond the thresholds follow the log-normal curve", () => {
    expect(metricScore("lcp", 2710)).toBe(86);
    expect(metricScore("inp", 140)).toBe(96);
    expect(metricScore("cls", 0.06)).toBe(98);
    expect(metricScore("fcp", 1520)).toBe(96);
    expect(metricScore("lcp", 8000)).toBe(3);
    expect(metricScore("cls", 0)).toBe(100);
    expect(metricScore("ttfb", 420)).toBeNull();
  });

  test("the Real Experience Score weighs LCP 30%, INP 30%, CLS 25% and FCP 15%", () => {
    expect(experienceScore({ lcp: 86, inp: 96, cls: 98, fcp: 96 })).toBe(94);
    expect(experienceScore({ lcp: 50, inp: 90 })).toBe(70);
    expect(experienceScore({ ttfb: 10 })).toBeNull();
    expect(scoreRating(94)).toBe("good");
    expect(scoreRating(89)).toBe("needs-improvement");
    expect(scoreRating(49)).toBe("poor");
  });

  test("ratings use good up to and poor above the thresholds", () => {
    expect(vitalRating("lcp", 2500)).toBe("good");
    expect(vitalRating("lcp", 4000)).toBe("needs-improvement");
    expect(vitalRating("lcp", 4001)).toBe("poor");
  });
});

describe("ingest", () => {
  test("keeps the latest value per metric id and drops impossible values", async () => {
    await send(
      [
        vital({ metric: "inp", id: "v5-inp-1", value: 120, selector: "button.buy" }),
        vital({ metric: "cls", id: "v5-cls-1", value: 12 }),
        vital({ metric: "lcp", id: "v5-lcp-1", value: -5 }),
        vital({ metric: "lcp", id: "v5-lcp-2", value: 130_000 }),
        vital({ metric: "speed", id: "v5-x-1", value: 5 }),
      ],
      browserHeaders.chrome,
    );
    await send(
      [vital({ metric: "inp", id: "v5-inp-1", value: 340, rating: "needs-improvement" })],
      browserHeaders.chrome,
    );
    const rows = await database.query<{
      id: string;
      value: number;
      rating: string;
      device: string;
    }>("SELECT id, value, rating, device FROM web_vitals WHERE project_id = $1", [project.id]);
    expect(rows.rows).toEqual([
      {
        id: `${project.id}:v5-inp-1`,
        value: 340,
        rating: "needs-improvement",
        device: "desktop",
      },
    ]);
  });

  test("stores the path without its query and works out the rating from the value", async () => {
    const event = vital({ metric: "lcp", id: "v5-lcp-query", value: 5000, rating: "good" });
    await send(
      [{ ...event, page: { ...event.page, path: "/checkout?token=abc#pay" } }],
      browserHeaders.chrome,
    );
    const rows = await database.query<{ path: string; rating: string }>(
      "SELECT path, rating FROM web_vitals WHERE id LIKE '%v5-lcp-query'",
    );
    expect(rows.rows).toEqual([{ path: "/checkout", rating: "poor" }]);
  });

  test("a later bot score or internal mark reaches the session's speed rows", async () => {
    const event = vital({ metric: "lcp", id: "v5-lcp-later", value: 1200 });
    await send(
      [{ ...event, session: "session-later", visitor: "visitor-later" }],
      browserHeaders.chrome,
    );
    const db = drizzle(database);
    await database.query("UPDATE events SET bot_score = 80 WHERE session_id = 'session-later'");
    await syncSessionScores(db, { from: new Date("2026-01-01"), to: new Date("2027-01-01") });
    await drizzleDetails(db).markVisitor(project.id, "visitor-later", true);
    const rows = await database.query<{ bot_score: number; is_internal: boolean }>(
      "SELECT bot_score, is_internal FROM web_vitals WHERE id LIKE '%v5-lcp-later'",
    );
    expect(rows.rows).toEqual([{ bot_score: 80, is_internal: true }]);
  });

  test("cleanup deletes speed rows past the project's retention", async () => {
    await database.query(
      `INSERT INTO web_vitals (id, project_id, ts, metric, value, rating, path, device)
       VALUES ('expired-vital', $1, '2025-01-01T00:00:00Z', 'lcp', 900, 'good', '/', 'mobile')`,
      [project.id],
    );
    const cleaned = await drizzleOps(drizzle(database)).cleanup(now, 1000);
    expect(cleaned.ok).toBe(true);
    const rows = await database.query("SELECT id FROM web_vitals WHERE id = 'expired-vital'");
    expect(rows.rows).toEqual([]);
  });

  test("bots never reach the speed table", async () => {
    await send([vital({ metric: "lcp", id: "v5-bot-1", value: 900 })], {
      "user-agent": agents.curl,
    });
    const rows = await database.query("SELECT id FROM web_vitals WHERE id LIKE '%v5-bot-1'");
    expect(rows.rows).toEqual([]);
  });
});

describe("reads", () => {
  beforeAll(async () => {
    await seed([
      ...Array.from({ length: 20 }, (_, index) => ({
        metric: "lcp",
        value: 1000 + index * 200,
        selector: index >= 10 ? "img.hero" : undefined,
      })),
      ...Array.from({ length: 4 }, (_, index) => ({
        metric: "lcp",
        value: 500 + index,
        device: "desktop",
        route: "/docs",
        day: "2026-09-03",
      })),
      ...Array.from({ length: 20 }, () => ({ metric: "cls", value: 0.02 })),
    ]);
  });

  test("summary gives percentiles and rating counts over the scope", async () => {
    const result = await speed.summary({ ...month, device: "mobile" }, 75);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const byMetric = Object.fromEntries(result.value.map((row) => [row.metric, row]));
    expect(byMetric.lcp).toEqual({
      metric: "lcp",
      samples: 20,
      value: 3850,
      good: 8,
      needsImprovement: 8,
      poor: 4,
    });
    expect(byMetric.cls).toMatchObject({ samples: 20, value: 0.02, good: 20 });
  });

  test("routes, the daily series and the selectors behind slow values", async () => {
    const routes = await speed.routes(month, 75, "route");
    expect(routes.ok ? routes.value.filter((row) => row.metric === "lcp") : null).toEqual(
      expect.arrayContaining([
        { route: "/", metric: "lcp", samples: 20, value: 3850 },
        { route: "/docs", metric: "lcp", samples: 4, value: 502.25 },
      ]),
    );
    const daily = await speed.series(month, 75, "lcp", "day");
    expect(daily.ok ? daily.value.map((day) => day.samples) : null).toEqual([0, 20, 4]);
    const elements = await speed.elements(month, 75, "lcp", 5, { limit: 10, offset: 0 });
    expect(elements).toEqual({
      ok: true,
      value: {
        rows: [{ selector: "img.hero", route: "/", samples: 10, value: 4350 }],
        total: 1,
      },
    });
  });

  let exactLcp = 0;

  test("the rollup writes daily percentiles and drops raw rows past the cut-off", async () => {
    const before = await speed.summary(month, 75);
    exactLcp = before.ok ? (before.value.find((row) => row.metric === "lcp")?.value ?? 0) : 0;
    const result = await speed.rollup(
      new Date("2026-09-01T00:00:00Z"),
      new Date("2026-09-04T00:00:00Z"),
      new Date("2026-09-03T00:00:00Z"),
    );
    expect(result.ok ? result.value.rowsWritten : null).toBe(3);
    const rolled = await database.query<{ route: string; samples: number; p75: number }>(
      "SELECT route, samples, p75 FROM rollup_vitals WHERE project_id = 'site' AND metric = 'lcp' ORDER BY route",
    );
    expect(rolled.rows).toEqual([
      { route: "/", samples: 20, p75: 3850 },
      { route: "/docs", samples: 4, p75: 502.25 },
    ]);
    const left = await database.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM web_vitals WHERE project_id = 'site'",
    );
    expect(left.rows).toEqual([{ n: 4 }]);
  });

  test("reads days before the raw window from the rollup and later days from raw rows", async () => {
    const spanning = { ...month, rawFrom: new Date("2026-09-03T00:00:00Z") };
    const summary = await speed.summary(spanning, 75);
    const lcp = summary.ok ? summary.value.find((row) => row.metric === "lcp") : null;
    expect(lcp).toMatchObject({
      metric: "lcp",
      samples: 24,
      good: 12,
      needsImprovement: 8,
      poor: 4,
    });
    expect(exactLcp).toBeGreaterThan(0);
    expect(Math.abs((lcp?.value ?? 0) - exactLcp)).toBeLessThanOrEqual(exactLcp * 0.02);
    const daily = await speed.series(spanning, 75, "lcp", "day");
    const days = daily.ok ? daily.value : [];
    expect(days.map(({ samples }) => samples)).toEqual([0, 20, 4]);
    expect(days[0]?.value).toBeNull();
    expect(Math.abs((days[1]?.value ?? 0) - 3850)).toBeLessThanOrEqual(3850 * 0.02);
    expect(days[2]?.value).toBe(502.25);
    const routes = await speed.routes(spanning, 75, "route");
    const lcpRoutes = routes.ok ? routes.value.filter((row) => row.metric === "lcp") : [];
    const docs = lcpRoutes.find((row) => row.route === "/docs");
    const home = lcpRoutes.find((row) => row.route === "/");
    expect(home?.samples).toBe(20);
    expect(Math.abs((home?.value ?? 0) - 3850)).toBeLessThanOrEqual(3850 * 0.02);
    expect(docs?.samples).toBe(4);
    expect(Math.abs((docs?.value ?? 0) - 502.25)).toBeLessThanOrEqual(502.25 * 0.02);
    const byPage = await speed.summary({ ...spanning, path: "/docs" }, 75);
    expect(byPage.ok ? byPage.value.map((row) => row.samples) : null).toEqual([4]);
  });
});

describe("rollups across devices", () => {
  const day = {
    ...month,
    from: new Date("2026-09-01T00:00:00Z"),
    to: new Date("2026-09-02T00:00:00Z"),
    rawFrom: new Date("2026-09-02T00:00:00Z"),
  };

  function bucketOf(value: number) {
    return Math.floor(Math.log(value) / Math.log(1.02));
  }

  async function insert(
    projectId: string,
    device: string,
    samples: number,
    p75: number,
    keep: boolean,
  ) {
    await database.query(
      `INSERT INTO rollup_vitals (project_id, day, route, device, metric, samples, p75, good, needs_improvement, poor, buckets)
       VALUES ($1, '2026-09-01', '/', $2, 'lcp', $3, $4, 0, 0, 0, $5)`,
      [projectId, device, samples, p75, keep ? JSON.stringify({ [bucketOf(p75)]: samples }) : null],
    );
  }

  async function lcpOf(projectId: string) {
    const summary = await speed.summary({ ...day, projectIds: [projectId] }, 75);
    return summary.ok ? summary.value.find((row) => row.metric === "lcp")?.value : undefined;
  }

  test("merges daily histograms instead of averaging percentiles", async () => {
    await insert("merged", "mobile", 100, 4000, true);
    await insert("merged", "desktop", 900, 1500, true);
    const value = await lcpOf("merged");
    expect(Math.abs((value ?? 0) - 1500)).toBeLessThanOrEqual(1500 * 0.02);
    const series = await speed.series({ ...day, projectIds: ["merged"] }, 75, "lcp", "day");
    const first = series.ok ? series.value[0]?.value : null;
    expect(Math.abs((first ?? 0) - 1500)).toBeLessThanOrEqual(1500 * 0.02);
  });

  test("falls back to the weighted mean for days rolled up without a histogram", async () => {
    await insert("legacy", "mobile", 100, 4000, false);
    await insert("legacy", "desktop", 900, 1500, false);
    expect(await lcpOf("legacy")).toBe(1750);
  });
});

describe("environments, hours and paths", () => {
  const week = {
    ...month,
    from: new Date("2026-09-10T00:00:00Z"),
    to: new Date("2026-09-11T00:00:00Z"),
  };

  beforeAll(async () => {
    await seed([
      ...Array.from({ length: 4 }, (_, index) => ({
        metric: "ttfb",
        value: 100 + index,
        day: "2026-09-10",
        hour: "08",
        route: "/blog/[slug]",
        path: index < 3 ? "/blog/one" : "/blog/two",
      })),
      ...Array.from({ length: 2 }, (_, index) => ({
        metric: "ttfb",
        value: 900 + index,
        day: "2026-09-10",
        hour: "14",
        route: "/blog/[slug]",
        path: "/blog/one",
        preview: true,
      })),
    ]);
  });

  test("production, preview and all split on the preview flag", async () => {
    async function samples(environment: "production" | "preview" | "all") {
      const result = await speed.summary({ ...week, environment }, 75);
      return result.ok ? result.value.map((row) => row.samples) : null;
    }
    expect(await samples("production")).toEqual([4]);
    expect(await samples("preview")).toEqual([2]);
    expect(await samples("all")).toEqual([6]);
  });

  test("the hourly series buckets by UTC hour", async () => {
    const result = await speed.series({ ...week, environment: "all" }, 75, "ttfb", "hour");
    expect(result.ok ? result.value.length : null).toBe(24);
    const filled = result.ok
      ? result.value
          .filter((point) => point.samples > 0)
          .map((point) => ({ hour: point.bucket.getUTCHours(), samples: point.samples }))
      : null;
    expect(filled).toEqual([
      { hour: 8, samples: 4 },
      { hour: 14, samples: 2 },
    ]);
  });

  test("routes group by route template or by path", async () => {
    const byRoute = await speed.routes(week, 75, "route");
    expect(byRoute.ok ? byRoute.value.map((row) => [row.route, row.samples]) : null).toEqual([
      ["/blog/[slug]", 4],
    ]);
    const byPath = await speed.routes(week, 75, "path");
    const paths = byPath.ok ? byPath.value.map((row) => [row.route, row.samples]) : null;
    expect(paths).toHaveLength(2);
    expect(paths).toEqual(
      expect.arrayContaining([
        ["/blog/one", 3],
        ["/blog/two", 1],
      ]),
    );
  });

  test("the rollup leaves preview rows out", async () => {
    await speed.rollup(week.from, week.to, new Date("2026-09-03T00:00:00Z"));
    const rolled = await database.query<{ samples: number }>(
      "SELECT sum(samples)::int AS samples FROM rollup_vitals WHERE project_id = 'site' AND metric = 'ttfb' AND day = '2026-09-10'",
    );
    expect(rolled.rows).toEqual([{ samples: 4 }]);
  });
});
