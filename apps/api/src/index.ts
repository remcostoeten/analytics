import {
  createEngine,
  defaultEnrichers,
  defaultSignals,
  defaultStages,
  ipSecretProblem,
} from "@remcostoeten/analytics-engine";
import { postgresAdapters } from "@remcostoeten/analytics-engine/adapters/postgres";
import {
  jsonLogger,
  systemClock,
  webCryptoHasher,
} from "@remcostoeten/analytics-engine/adapters/system";

import { createApp } from "./app";
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
const adapters = postgresAdapters(process.env.DATABASE_URL ?? "", clock);
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
      { ...adapters, geo: geo.lookup, hasher: webCryptoHasher(), clock, logger: log },
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
  dashboardOrigin: process.env.DASHBOARD_ORIGIN ?? null,
  docsBase: process.env.DOCS_BASE ?? "https://api.remcostoeten.nl/v2/openapi",
  geo: { city: geo.city, asn: geo.asn, loadMs: geo.loadMs },
});
