import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { memoryGeo } from "@remcostoeten/analytics-engine/adapters/memory";
import { maxmindGeo } from "@remcostoeten/analytics-engine/adapters/maxmind";
import type { GeoLookup } from "@remcostoeten/analytics-engine";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";

export type GeoSource = {
  lookup: GeoLookup;
  city: Nullable<string>;
  asn: Nullable<string>;
  loadMs: number;
};

type Props = {
  explicit: Nullable<string>;
  sourceDirectory: string;
  cwd: string;
};

/**
 * @name candidatePaths
 * @description Lists where a MaxMind database may sit: an explicit path, next to the source, or
 * relative to the working directory of a Vercel function in a monorepo.
 *
 * @example
 * candidatePaths("GeoLite2-City.mmdb", { explicit: null, sourceDirectory: import.meta.dir, cwd: process.cwd() });
 */
export function candidatePaths(file: string, where: Props) {
  const bundled = [
    join(where.sourceDirectory, "..", "data", file),
    join(where.cwd, "data", file),
    join(where.cwd, "apps", "api", "data", file),
  ];
  return where.explicit ? [where.explicit, ...bundled] : bundled;
}

function firstExisting(paths: string[]) {
  return paths.find((candidate) => existsSync(candidate)) ?? null;
}

/**
 * @name openGeo
 * @description Opens the first City and ASN databases found and builds the engine's
 * `GeoLookup`. Without a City database every lookup is empty, so ingest still works and geo
 * columns stay null.
 *
 * @example
 * const geo = openGeo(candidatePaths("GeoLite2-City.mmdb", where), candidatePaths("GeoLite2-ASN.mmdb", where));
 */
export function openGeo(cityPaths: string[], asnPaths: string[]): GeoSource {
  const started = performance.now();
  const city = firstExisting(cityPaths);
  const asn = firstExisting(asnPaths);
  const lookup = city
    ? maxmindGeo(readFileSync(city), asn ? readFileSync(asn) : null)
    : memoryGeo(new Map());
  return { lookup, city, asn: city ? asn : null, loadMs: Math.round(performance.now() - started) };
}
