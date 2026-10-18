import { AsyncLocalStorage } from "node:async_hooks";

import type { GeoRecord } from "@spoar/engine";
import type { Nullable } from "@spoar/shared/semantic";

import type { GeoSource } from "./geo";

export type CloudflareLocation = {
  country?: string;
  region?: string;
  regionCode?: string;
  city?: string;
  postalCode?: string;
  timezone?: string;
  latitude?: string;
  longitude?: string;
  continent?: string;
  asn?: number;
  asOrganization?: string;
};

type Scope = {
  ip: Nullable<string>;
  location: Nullable<CloudflareLocation>;
};

const scope = new AsyncLocalStorage<Scope>();

const empty: GeoRecord = {
  geo: {
    country: null,
    region: null,
    city: null,
    postalCode: null,
    timezone: null,
    latitude: null,
    longitude: null,
    continent: null,
  },
  network: { asn: null, asOrg: null },
};

function coordinate(value: string | undefined) {
  const parsed = value === undefined ? Number.NaN : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toRecord(location: CloudflareLocation): GeoRecord {
  return {
    geo: {
      country: location.country && location.country !== "XX" ? location.country : null,
      region: location.regionCode ?? location.region ?? null,
      city: location.city ?? null,
      postalCode: location.postalCode ?? null,
      timezone: location.timezone ?? null,
      latitude: coordinate(location.latitude),
      longitude: coordinate(location.longitude),
      continent: location.continent ?? null,
    },
    network: { asn: location.asn ?? null, asOrg: location.asOrganization ?? null },
  };
}

/**
 * @name withCloudflareGeo
 * @description Runs a request handler with the request's Cloudflare location in scope, so
 * `cloudflareGeo` can answer lookups for the connecting address without a MaxMind database.
 *
 * @example
 * return withCloudflareGeo(request.headers.get("cf-connecting-ip"), request.cf ?? null, () => app.fetch(request));
 */
export function withCloudflareGeo<Value>(
  ip: Nullable<string>,
  location: Nullable<CloudflareLocation>,
  run: () => Value,
): Value {
  return scope.run({ ip, location }, run);
}

/**
 * @name cloudflareGeo
 * @description A geo source backed by Cloudflare's per-request location. It only answers for
 * the address that connected to the Worker; an address forwarded by a proxy gets an empty
 * record, because Cloudflare located the proxy, not the visitor.
 *
 * @example
 * buildApi({ geo: cloudflareGeo(), adapter: CloudflareAdapter, liveSocket: false, commit: null });
 */
export function cloudflareGeo(): GeoSource {
  function lookup(ip: string) {
    const current = scope.getStore();
    if (!current?.location || current.ip !== ip) return empty;
    return toRecord(current.location);
  }
  return { lookup: { lookup }, city: "cloudflare", asn: "cloudflare", loadMs: 0 };
}
