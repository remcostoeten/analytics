import {
  createEngine,
  defaultEnrichers,
  defaultSignals,
  defaultStages,
  ipSecretProblem,
} from "@spoar/engine";
import {
  neonTransact,
  postgresAccess,
  postgresAdapters,
  routeLocalNeon,
} from "@spoar/engine/adapters/postgres";
import { jsonLogger, systemClock, webCryptoHasher } from "@spoar/engine/adapters/system";

import { apiLinks } from "@spoar/engine/alerts";
import { findPlugin } from "@spoar/engine/config";

import config from "../analytics.config";
import { createApp } from "./app";
import { betterAuthSessions, createAuth } from "./auth/better-auth";
import { candidatePaths, openGeo } from "./geo";

const production = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
const ipSecret = process.env.IP_HASH_SECRET ?? "";
const problem = ipSecretProblem(ipSecret);
// Without a strong secret the stored IP hashes could be reversed, so production refuses to start.
if (problem && production)
  throw new Error(`Refusing to start: ${problem}. Generate one with: openssl rand -hex 32`);
if (problem) console.warn(`[api] ${problem}; using an insecure development secret.`);

const where = { explicit: null, sourceDirectory: import.meta.dir, cwd: process.cwd() };
const geo = openGeo(
  candidatePaths("GeoLite2-City.mmdb", { ...where, explicit: process.env.GEOIP_CITY_PATH ?? null }),
  candidatePaths("GeoLite2-ASN.mmdb", { ...where, explicit: process.env.GEOIP_ASN_PATH ?? null }),
);
const clock = systemClock();
const apiUrl = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 3100}`;
const alertsPlugin = findPlugin(config, "alerts");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Refusing to start: DATABASE_URL is not set.");
routeLocalNeon(process.env.NEON_LOCAL_PROXY);
const adapters = postgresAdapters(databaseUrl, clock);
const stores = postgresAccess(databaseUrl);
const hasher = webCryptoHasher();
const authSecret = process.env.BETTER_AUTH_SECRET ?? "";
// Sessions signed with a guessable secret could be forged, so production refuses to start.
if (production && authSecret.length < 32)
  throw new Error("Refusing to start: BETTER_AUTH_SECRET must be at least 32 characters.");
const dashboardOrigin = process.env.DASHBOARD_ORIGIN ?? null;
const auth = createAuth({
  db: stores.db,
  members: stores.members,
  secret: authSecret || "insecure-development-auth-secret-change-me",
  baseURL: apiUrl,
  github: {
    clientId: process.env.GITHUB_CLIENT_ID ?? "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
  },
  cookieDomain: process.env.AUTH_COOKIE_DOMAIN || null,
  trustedOrigins: dashboardOrigin ? [dashboardOrigin] : [],
  secure: production,
});
const settings = {
  ipSecret: problem ? "insecure-development-secret-change-me" : ipSecret,
  rateLimit: { limit: Number(process.env.INGEST_RATE_LIMIT ?? 100), windowSeconds: 60 },
};

function logger(requestId: string) {
  return jsonLogger((line) => console.log(line), { requestId });
}

export default createApp({
  engine: (log) =>
    createEngine(
      { ...adapters, geo: geo.lookup, hasher, clock, logger: log, logs: stores.logs },
      {
        stages: defaultStages,
        signals: defaultSignals,
        enrichers: defaultEnrichers,
        dimensions: [],
      },
      settings,
    ),
  logger,
  clock: () => clock.now(),
  dashboardOrigin,
  docsBase: process.env.DOCS_BASE ?? "https://api.analytics.remcostoeten.nl/v2/openapi",
  geo: { city: geo.city, asn: geo.asn, loadMs: geo.loadMs },
  access: {
    projects: stores.projects,
    tokens: stores.tokens,
    members: stores.members,
    sessions: betterAuthSessions(auth, stores.members),
    hasher,
    clock: () => clock.now(),
    cronSecret: process.env.CRON_SECRET || null,
  },
  reads: {
    store: stores.reads,
    details: stores.details,
    feed: stores.feed,
    speed: stores.speed,
    issues: stores.issues,
    live: { waitMs: 25_000, streamMs: 55_000 },
    limiter: adapters.limiter,
    hasher,
    ipSecret: settings.ipSecret,
    publicLimit: Number(process.env.PUBLIC_READ_LIMIT ?? 120),
    clock: () => clock.now(),
  },
  query: {
    runner: stores.queries,
    log: stores.queryLog,
    saved: stores.savedQueries,
    limiter: adapters.limiter,
    perMinute: Number(process.env.QUERY_LIMIT ?? 30),
  },
  annotations: stores.annotations,
  authHandler: auth.handler,
  alerts: alertsPlugin
    ? { plugin: alertsPlugin, store: stores.alerts, links: apiLinks(apiUrl) }
    : null,
  internalSecret: process.env.INTERNAL_PROJECT_SECRET || null,
  ops: stores.ops,
  crux: process.env.CRUX_API_KEY ? { key: process.env.CRUX_API_KEY, send: fetch } : null,
  widget: {
    store: stores.widget,
    logs: stores.logs,
    keys: adapters.projects,
    limiter: adapters.limiter,
    reportsPerMinute: Number(process.env.CLIENT_REPORT_LIMIT ?? 60),
  },
  history: {
    repo: "remcostoeten/analytics",
    send: fetch,
    token: process.env.GITHUB_TOKEN || null,
  },
  ping: () => neonTransact(databaseUrl)([{ text: "SELECT 1", params: [] }]),
  commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
});
