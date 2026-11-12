import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { memoryGeo } from "@spoar/engine/adapters/memory";
import { maxmindGeo } from "@spoar/engine/adapters/maxmind";
import type { GeoLookup } from "@spoar/engine";
import type { Nullable } from "@spoar/shared/semantic";

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
 * @description Finds the first City and ASN databases and builds the engine's `GeoLookup`. The
 * files are read on the first lookup, not here, so an instance that only serves reads never pays
 * for them; `loadMs` is 0 until then. Without a City database every lookup is empty, so ingest
 * still works and geo columns stay null.
 *
 * @example
 * const geo = openGeo(candidatePaths("GeoLite2-City.mmdb", where), candidatePaths("GeoLite2-ASN.mmdb", where));
 */
export function openGeo(cityPaths: string[], asnPaths: string[]): GeoSource {
  const city = firstExisting(cityPaths);
  const asn = city ? firstExisting(asnPaths) : null;
  const loaded: { lookup: Nullable<GeoLookup>; ms: number } = { lookup: null, ms: 0 };
  function load(file: string) {
    const started = performance.now();
    const lookup = maxmindGeo(readFileSync(file), asn ? readFileSync(asn) : null);
    loaded.lookup = lookup;
    loaded.ms = Math.round(performance.now() - started);
    return lookup;
  }
  const lookup: GeoLookup = city
    ? { lookup: (ip) => (loaded.lookup ?? load(city)).lookup(ip) }
    : memoryGeo(new Map());
  return {
    lookup,
    city,
    asn,
    get loadMs() {
      return loaded.ms;
    },
  };
}
