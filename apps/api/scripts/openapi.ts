import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { createEngine } from "@spoar/engine";
import { alerts, apiLinks, discord, mail, smtp, webhook } from "@spoar/engine/alerts";
import { fixedClock, memoryLogger } from "@spoar/engine/adapters/memory";
import { pgliteAccess, pgliteAdapters } from "@spoar/engine/adapters/pglite";
import { webCryptoHasher } from "@spoar/engine/adapters/system";

import { createApp } from "../src/app";
import { openGeo } from "../src/geo";

const target = join(import.meta.dir, "..", "openapi.json");

/**
 * @name openapiDocument
 * @description The API's OpenAPI 3 document as formatted JSON, built from the route schemas
 * without a database: the stores are created on an empty in-memory PGlite and never queried.
 * Alerts are on with every channel and the dev widget is on, so their routes are documented.
 *
 * @example
 * const json = await openapiDocument();
 */
async function openapiDocument(): Promise<string> {
  const database = new PGlite();
  const clock = fixedClock(new Date("2026-01-01T00:00:00.000Z"));
  const stores = pgliteAccess(database);
  const adapters = pgliteAdapters(database, clock);
  const hasher = webCryptoHasher();
  const geo = openGeo([], []);
  const app = createApp({
    engine: (logger) =>
      createEngine(
        { ...adapters, geo: geo.lookup, hasher, clock, logger },
        { stages: [], signals: [], enrichers: [], dimensions: [] },
        { ipSecret: "x".repeat(48), rateLimit: { limit: 1, windowSeconds: 60 } },
      ),
    logger: () => memoryLogger(),
    clock: () => clock.now(),
    dashboardOrigin: null,
    docsBase: "https://api.analytics.remcostoeten.nl/v2/openapi",
    geo: { city: null, asn: null, loadMs: 0 },
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
      live: { waitMs: 0, streamMs: 0 },
      limiter: adapters.limiter,
      hasher,
      ipSecret: "x".repeat(48),
      publicLimit: 1,
      clock: () => clock.now(),
    },
    query: {
      runner: stores.queries,
      log: stores.queryLog,
      saved: stores.savedQueries,
      limiter: adapters.limiter,
      perMinute: 1,
    },
    annotations: stores.annotations,
    authHandler: null,
    ops: stores.ops,
    widget: {
      store: stores.widget,
      logs: stores.logs,
      keys: adapters.projects,
      limiter: adapters.limiter,
      reportsPerMinute: 1,
    },
    alerts: {
      plugin: alerts({
        channels: [mail({ transport: smtp(undefined), from: "a@b.co" }), webhook(), discord()],
      }),
      store: stores.alerts,
      links: apiLinks("https://api.analytics.remcostoeten.nl"),
    },
  });
  const response = await app.handle(new Request("http://localhost/v2/openapi/json"));
  const document: unknown = await response.json();
  await database.close();
  return `${JSON.stringify(document, null, 2)}\n`;
}

if (import.meta.main) {
  const json = await openapiDocument();
  if (process.argv.includes("--check")) {
    const current = readFileSync(target, "utf8");
    if (current !== json) {
      console.error("apps/api/openapi.json is stale; run bun run --cwd apps/api openapi");
      process.exit(1);
    }
    console.log("apps/api/openapi.json is current");
  } else {
    writeFileSync(target, json);
    console.log(`Wrote ${target}`);
  }
}
