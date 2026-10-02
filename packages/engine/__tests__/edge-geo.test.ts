import { describe, expect, test } from "bun:test";

import { edgeLocation, emptyLocation, mergeLocation } from "../src/utilities/edge-geo";

describe("edgeLocation", () => {
  test.each([
    [
      "Vercel headers, decoded",
      {
        "x-vercel-ip-country": "NL",
        "x-vercel-ip-country-region": "UT",
        "x-vercel-ip-city": "%27s-Hertogenbosch",
        "x-vercel-ip-latitude": "51.69",
        "x-vercel-ip-longitude": "5.30",
        "x-vercel-ip-timezone": "Europe/Amsterdam",
        "x-vercel-ip-postal-code": "5211",
        "x-vercel-ip-continent": "EU",
      },
      {
        ...emptyLocation,
        country: "NL",
        region: "UT",
        city: "'s-Hertogenbosch",
        postalCode: "5211",
        timezone: "Europe/Amsterdam",
        latitude: 51.69,
        longitude: 5.3,
        continent: "EU",
      },
    ],
    [
      "Cloudflare headers",
      { "cf-ipcountry": "BE", "cf-region-code": "VLG", "cf-ipcity": "Gent", "cf-iplatitude": "x" },
      { ...emptyLocation, country: "BE", region: "VLG", city: "Gent" },
    ],
    ["Cloudflare unknown country", { "cf-ipcountry": "XX" }, emptyLocation],
    ["Cloudflare Tor", { "cf-ipcountry": "T1" }, emptyLocation],
    [
      "Vercel before Cloudflare",
      { "x-vercel-ip-country": "NL", "cf-ipcountry": "BE" },
      { ...emptyLocation, country: "NL" },
    ],
    ["no headers", {}, emptyLocation],
  ])("%s", (_, headers, expected) => {
    expect(edgeLocation(new Headers(headers))).toEqual(expected);
  });
});

describe("mergeLocation", () => {
  test("fills only the empty fields", () => {
    expect(
      mergeLocation(
        { ...emptyLocation, city: "Utrecht", country: "NL" },
        { ...emptyLocation, city: "Amsterdam", timezone: "Europe/Amsterdam" },
      ),
    ).toEqual({ ...emptyLocation, city: "Utrecht", country: "NL", timezone: "Europe/Amsterdam" });
  });

  test("keeps a city with its id, and coordinates with their accuracy", () => {
    const edge = { ...emptyLocation, city: "Amsterdam", latitude: 52.37, longitude: 4.89 };
    const lookedUp = {
      ...emptyLocation,
      region: "UT",
      regionId: 2745909,
      city: "Utrecht",
      cityId: 2745912,
      latitude: 52.09,
      longitude: 5.12,
      accuracyKm: 20,
    };
    expect(mergeLocation(edge, lookedUp)).toEqual({
      ...emptyLocation,
      region: "UT",
      regionId: 2745909,
      city: "Amsterdam",
      cityId: null,
      latitude: 52.37,
      longitude: 4.89,
      accuracyKm: null,
    });
  });
});
