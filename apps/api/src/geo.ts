import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { memoryGeo } from "@spoar/engine/adapters/memory";
import { maxmindLocation, maxmindNetwork } from "@spoar/engine/adapters/maxmind";
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

function lazily<Lookup>(file: string, open: (contents: Buffer) => Lookup, loaded: { ms: number }) {
  const opened: { lookup: Nullable<Lookup> } = { lookup: null };
  return () => {
    if (opened.lookup) return opened.lookup;
    const started = performance.now();
    opened.lookup = open(readFileSync(file));
    loaded.ms += Math.round(performance.now() - started);
    return opened.lookup;
  };
}

/**
 * @name openGeo
 * @description Finds the first City and ASN databases and builds the engine's `GeoLookup`. Each
 * file is read on its first lookup, not here: an instance that only serves reads never pays for
 * them, and on Vercel the City file stays closed because the edge headers already locate the
 * visitor. `loadMs` is the time spent opening them so far. Without a City database every location
 * is empty, so ingest still works and geo columns stay null.
 *
 * @example
 * const geo = openGeo(candidatePaths("GeoLite2-City.mmdb", where), candidatePaths("GeoLite2-ASN.mmdb", where));
 */
export function openGeo(cityPaths: string[], asnPaths: string[]): GeoSource {
  const city = firstExisting(cityPaths);
  const asn = city ? firstExisting(asnPaths) : null;
  const loaded = { ms: 0 };
  const empty = memoryGeo(new Map());
  const cityLookup = city ? lazily(city, maxmindLocation, loaded) : null;
  const asnLookup = asn ? lazily(asn, maxmindNetwork, loaded) : null;
  const lookup: GeoLookup = {
    location: cityLookup ? (ip) => cityLookup()(ip) : empty.location,
    network: asnLookup ? (ip) => asnLookup()(ip) : empty.network,
  };
  return {
    lookup,
    city,
    asn,
    get loadMs() {
      return loaded.ms;
    },
  };
}
