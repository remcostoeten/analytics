import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { createApp } from "@remcostoeten/analytics-api/app";
import { openGeo } from "@remcostoeten/analytics-api/geo";
import {
  createEngine,
  defaultEnrichers,
  defaultSignals,
  defaultStages,
} from "@remcostoeten/analytics-engine";
import { memoryLogger } from "@remcostoeten/analytics-engine/adapters/memory";
import { pgliteAccess, pgliteAdapters } from "@remcostoeten/analytics-engine/adapters/pglite";
import { systemClock, webCryptoHasher } from "@remcostoeten/analytics-engine/adapters/system";
import { runMigrations } from "@remcostoeten/analytics-engine/db/migrate";
import {
  migrationsDirectory,
  readMigrations,
} from "@remcostoeten/analytics-engine/db/migration-files";
import { createProxy } from "@remcostoeten/analytics-sdk/proxy";

import { apiPort, publicKey, secretKey, sitePort } from "./ports";

const dist = join(import.meta.dir, "..", "packages", "sdk", "dist");
const database = new PGlite();
const clock = systemClock();
const geo = openGeo([], []);

async function prepare() {
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
    "INSERT INTO projects (id, name, domain, allowed_origins, public_key, secret_key_hash) VALUES ('site', 'site', 'localhost', '{}', $1, $2)",
    [publicKey, await webCryptoHasher().sha256(secretKey)],
  );
}

async function bundle() {
  const result = await Bun.build({
    entrypoints: [join(import.meta.dir, "site", "app.ts")],
    target: "browser",
    format: "esm",
    plugins: [
      {
        name: "built-sdk",
        setup: (build) => {
          build.onResolve({ filter: /^@remcostoeten\/analytics-sdk(\/plugins)?$/ }, (args) => ({
            path: join(dist, args.path.endsWith("/plugins") ? "plugins.mjs" : "index.mjs"),
          }));
        },
      },
    ],
  });
  const [output] = result.outputs;
  if (!result.success || !output) throw new Error("Could not bundle the fixture site");
  return output.text();
}

function page(scenario: string) {
  return `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Fixture ${scenario}</title></head>
  <body data-scenario="${scenario}">
    <h1>Fixture ${scenario}</h1>
    <p>Enough text for a largest contentful paint.</p>
    <button id="grant" type="button">Grant consent</button>
    <button id="navigate" type="button">Next page</button>
    <button id="fail" type="button">Throw an error</button>
    <input id="name" aria-label="Name">
    <script type="module" src="/app.js"></script>
  </body>
</html>`;
}

async function rows(url: URL) {
  const run = url.searchParams.get("run") ?? "";
  const result = await database.query(
    "SELECT name, type, path, route, bot_score, bot_reasons, device_type, meta FROM events WHERE path LIKE $1 ORDER BY id",
    [`%/${run}%`],
  );
  return Response.json(result.rows);
}

await prepare();
const script = await bundle();

const api = createApp({
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
        ipSecret: "x".repeat(48),
        rateLimit: { limit: 100_000, windowSeconds: 60 },
      },
    ),
  logger: () => memoryLogger(),
  clock: () => clock.now(),
  dashboardOrigin: null,
  docsBase: "http://localhost/v2/openapi",
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
    feed: pgliteAccess(database).feed,
    speed: pgliteAccess(database).speed,
    live: { waitMs: 25_000, streamMs: 55_000 },
    limiter: pgliteAdapters(database, clock).limiter,
    hasher: webCryptoHasher(),
    ipSecret: "x".repeat(48),
    publicLimit: 1000,
    clock: () => clock.now(),
  },
  query: {
    runner: pgliteAccess(database).queries,
    log: pgliteAccess(database).queryLog,
    saved: pgliteAccess(database).savedQueries,
    limiter: pgliteAdapters(database, clock).limiter,
    perMinute: 30,
  },
  authHandler: null,
});
api.listen(apiPort);

const proxy = createProxy({ secret: secretKey, endpoint: `http://localhost:${apiPort}` });

Bun.serve({
  port: sitePort,
  fetch: (request) => {
    const url = new URL(request.url);
    if (url.pathname === "/_ra") return proxy(request);
    if (url.pathname === "/app.js") {
      return new Response(script, { headers: { "content-type": "text/javascript" } });
    }
    if (url.pathname === "/__e2e/events") return rows(url);
    const [, scenario] = url.pathname.split("/");
    if (scenario === "direct" || scenario === "proxy" || scenario === "consent") {
      return new Response(page(scenario), { headers: { "content-type": "text/html" } });
    }
    return new Response("Not found", { status: 404 });
  },
});

console.log(`e2e site on http://localhost:${sitePort}, API on http://localhost:${apiPort}`);
