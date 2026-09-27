import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { Nullable } from "@remcostoeten/analytics-shared/semantic";
import { Reader } from "mmdb-lib";
import type { CityResponse } from "mmdb-lib";

export type CityLookup = {
  country: Nullable<string>;
  region: Nullable<string>;
  city: Nullable<string>;
  timezone: Nullable<string>;
  latitude: Nullable<number>;
  longitude: Nullable<number>;
};

export type CityDatabase = {
  reader: Nullable<Reader<CityResponse>>;
  path: Nullable<string>;
  loadMs: number;
};

const cityFile = "GeoLite2-City.mmdb";

/**
 * @name candidatePaths
 * @description Lists where the City database may sit: an explicit path, next to the source, or
 * relative to the working directory of a Vercel function in a monorepo.
 *
 * @example
 * candidatePaths(process.env.GEOIP_CITY_PATH ?? null, import.meta.dir, process.cwd());
 */
export function candidatePaths(explicit: Nullable<string>, sourceDirectory: string, cwd: string) {
  const bundled = [
    join(sourceDirectory, "..", "data", cityFile),
    join(cwd, "data", cityFile),
    join(cwd, "apps", "api", "data", cityFile),
  ];
  return explicit ? [explicit, ...bundled] : bundled;
}

/**
 * @name openCityDatabase
 * @description Opens the first City database found, timing the load for the spike's findings.
 * Returns an empty reader when none exists, so lookups degrade to nulls.
 *
 * @example
 * const database = openCityDatabase(candidatePaths(null, import.meta.dir, process.cwd()));
 */
export function openCityDatabase(paths: string[]): CityDatabase {
  const started = performance.now();
  const path = paths.find((candidate) => existsSync(candidate)) ?? null;
  const reader = path ? new Reader<CityResponse>(readFileSync(path)) : null;
  return { reader, path, loadMs: Math.round(performance.now() - started) };
}

/**
 * @name lookupCity
 * @description Resolves an IP address to country, region, city, timezone and coordinates, with
 * nulls for anything the database does not know.
 *
 * @example
 * lookupCity(database.reader, "81.2.69.160").country; // "GB"
 */
export function lookupCity(
  reader: Nullable<Reader<CityResponse>>,
  ip: Nullable<string>,
): CityLookup {
  const record = reader && ip ? reader.get(ip) : null;
  return {
    country: record?.country?.iso_code ?? null,
    region: record?.subdivisions?.[0]?.names?.en ?? null,
    city: record?.city?.names?.en ?? null,
    timezone: record?.location?.time_zone ?? null,
    latitude: record?.location?.latitude ?? null,
    longitude: record?.location?.longitude ?? null,
  };
}
