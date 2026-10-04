import type { Nullable } from "@spoar/shared/semantic";

import type { Location } from "../ports";
import type { HeaderBag } from "./client-ip";

const unknownCloudflareCountries = new Set(["XX", "T1"]);

export const emptyLocation: Location = {
  country: null,
  region: null,
  city: null,
  postalCode: null,
  timezone: null,
  latitude: null,
  longitude: null,
  continent: null,
};

function decoded(value: Nullable<string>) {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function coordinate(value: Nullable<string>) {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function vercelLocation(headers: HeaderBag): Nullable<Location> {
  const country = headers.get("x-vercel-ip-country");
  if (!country) return null;
  return {
    country,
    region: decoded(headers.get("x-vercel-ip-country-region")),
    city: decoded(headers.get("x-vercel-ip-city")),
    postalCode: headers.get("x-vercel-ip-postal-code"),
    timezone: headers.get("x-vercel-ip-timezone"),
    latitude: coordinate(headers.get("x-vercel-ip-latitude")),
    longitude: coordinate(headers.get("x-vercel-ip-longitude")),
    continent: headers.get("x-vercel-ip-continent"),
  };
}

function cloudflareLocation(headers: HeaderBag): Nullable<Location> {
  const country = headers.get("cf-ipcountry");
  if (!country || unknownCloudflareCountries.has(country)) return null;
  return {
    country,
    region: decoded(headers.get("cf-region-code") ?? headers.get("cf-region")),
    city: decoded(headers.get("cf-ipcity")),
    postalCode: headers.get("cf-postal-code"),
    timezone: headers.get("cf-timezone"),
    latitude: coordinate(headers.get("cf-iplatitude")),
    longitude: coordinate(headers.get("cf-iplongitude")),
    continent: headers.get("cf-ipcontinent"),
  };
}

/**
 * @name edgeLocation
 * @description The location Vercel or Cloudflare put in the request headers, Vercel first, or an
 * empty location when neither did.
 *
 * @example
 * edgeLocation(new Headers({ "x-vercel-ip-country": "NL", "x-vercel-ip-city": "Utrecht" })).city; // "Utrecht"
 */
export function edgeLocation(headers: HeaderBag): Location {
  return vercelLocation(headers) ?? cloudflareLocation(headers) ?? emptyLocation;
}

/**
 * @name mergeLocation
 * @description Fills every empty field of `base` from `fallback`.
 *
 * @example
 * mergeLocation({ ...emptyLocation, city: "Utrecht" }, { ...emptyLocation, country: "NL" });
 */
export function mergeLocation(base: Location, fallback: Location): Location {
  return {
    country: base.country ?? fallback.country,
    region: base.region ?? fallback.region,
    city: base.city ?? fallback.city,
    postalCode: base.postalCode ?? fallback.postalCode,
    timezone: base.timezone ?? fallback.timezone,
    latitude: base.latitude ?? fallback.latitude,
    longitude: base.longitude ?? fallback.longitude,
    continent: base.continent ?? fallback.continent,
  };
}
