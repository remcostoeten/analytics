import { beforeAll, describe, expect, test } from "bun:test";

import { PGlite } from "@electric-sql/pglite";

import { drizzleSpeed } from "../src/adapters/drizzle-speed";
import { fixedClock, memoryGeo, memoryLogger } from "../src/adapters/memory";
import { pgliteAdapters } from "../src/adapters/pglite";
import { webCryptoHasher } from "../src/adapters/system";
import { runMigrations } from "../src/db/migrate";
import { migrationsDirectory, readMigrations } from "../src/db/migration-files";
import { defaultEnrichers } from "../src/enrichers";
import { createEngine } from "../src/pipeline";
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
  route: null,
  path: null,
  country: null,
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
    selector?: string;
  }[],
) {
  for (const [index, row] of rows.entries()) {
    await database.query(
      `INSERT INTO web_vitals (id, project_id, ts, metric, value, rating, route, path, device, selector)
       VALUES ($1, 'site', $2, $3, $4, $5, $6, $6, $7, $8)`,
      [
        `seed-${row.metric}-${index}-${row.value}`,
        `${row.day ?? "2026-09-02"}T10:00:00Z`,
        row.metric,
        row.value,
        row.rating ?? vitalRating(row.metric as "lcp", row.value),
        row.route ?? "/",
        row.device ?? "mobile",
        row.selector ?? null,
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
    const routes = await speed.routes(month, 75);
    expect(routes.ok ? routes.value.filter((row) => row.metric === "lcp") : null).toEqual(
      expect.arrayContaining([
        { route: "/", metric: "lcp", samples: 20, value: 3850 },
        { route: "/docs", metric: "lcp", samples: 4, value: 502.25 },
      ]),
    );
    const daily = await speed.daily(month, 75, "lcp");
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

  test("the rollup writes daily percentiles and drops raw rows past the cut-off", async () => {
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
});
