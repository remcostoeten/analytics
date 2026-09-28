import {
  createEngine,
  defaultEnrichers,
  defaultSignals,
  defaultStages,
  ipSecretProblem,
} from "@remcostoeten/analytics-engine";
import { postgresAccess, postgresAdapters } from "@remcostoeten/analytics-engine/adapters/postgres";
import {
  jsonLogger,
  systemClock,
  webCryptoHasher,
} from "@remcostoeten/analytics-engine/adapters/system";

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
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Refusing to start: DATABASE_URL is not set.");
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
  baseURL: process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 3100}`,
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
      { ...adapters, geo: geo.lookup, hasher, clock, logger: log },
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
  docsBase: process.env.DOCS_BASE ?? "https://api.remcostoeten.nl/v2/openapi",
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
    live: { waitMs: 25_000, streamMs: 55_000 },
    limiter: adapters.limiter,
    hasher,
    ipSecret: settings.ipSecret,
    publicLimit: Number(process.env.PUBLIC_READ_LIMIT ?? 120),
    clock: () => clock.now(),
  },
  authHandler: auth.handler,
});
