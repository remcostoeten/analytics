import type { Nullable } from "@remcostoeten/analytics-shared/semantic";

import type { Location } from "../ports";
import type { HeaderBag } from "./client-ip";

const unknownCloudflareCountries = new Set(["XX", "T1"]);

export const emptyLocation: Location = {
  country: null,
  region: null,
  regionId: null,
  city: null,
  cityId: null,
  postalCode: null,
  timezone: null,
  latitude: null,
  longitude: null,
  accuracyKm: null,
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
    regionId: null,
    city: decoded(headers.get("x-vercel-ip-city")),
    cityId: null,
    postalCode: headers.get("x-vercel-ip-postal-code"),
    timezone: headers.get("x-vercel-ip-timezone"),
    latitude: coordinate(headers.get("x-vercel-ip-latitude")),
    longitude: coordinate(headers.get("x-vercel-ip-longitude")),
    accuracyKm: null,
    continent: headers.get("x-vercel-ip-continent"),
  };
}

function cloudflareLocation(headers: HeaderBag): Nullable<Location> {
  const country = headers.get("cf-ipcountry");
  if (!country || unknownCloudflareCountries.has(country)) return null;
  return {
    country,
    region: decoded(headers.get("cf-region-code") ?? headers.get("cf-region")),
    regionId: null,
    city: decoded(headers.get("cf-ipcity")),
    cityId: null,
    postalCode: headers.get("cf-postal-code"),
    timezone: headers.get("cf-timezone"),
    latitude: coordinate(headers.get("cf-iplatitude")),
    longitude: coordinate(headers.get("cf-iplongitude")),
    accuracyKm: null,
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

function region(location: Location) {
  return { region: location.region, regionId: location.regionId };
}

function city(location: Location) {
  return { city: location.city, cityId: location.cityId };
}

function coordinates(location: Location) {
  const { latitude, longitude, accuracyKm } = location;
  return { latitude, longitude, accuracyKm };
}

/**
 * @name mergeLocation
 * @description Fills every empty field of `base` from `fallback`. A region and its id, a city and
 * its id, and the coordinates with their accuracy radius are taken as a whole from one side, so
 * an id never labels a place named by the other source.
 *
 * @example
 * mergeLocation({ ...emptyLocation, city: "Utrecht" }, { ...emptyLocation, country: "NL" });
 */
export function mergeLocation(base: Location, fallback: Location): Location {
  return {
    country: base.country ?? fallback.country,
    ...(base.region === null ? region(fallback) : region(base)),
    ...(base.city === null ? city(fallback) : city(base)),
    postalCode: base.postalCode ?? fallback.postalCode,
    timezone: base.timezone ?? fallback.timezone,
    ...(base.latitude === null ? coordinates(fallback) : coordinates(base)),
    continent: base.continent ?? fallback.continent,
  };
}
