import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { openGeo } from "../src/geo";

const city = join(import.meta.dir, "fixtures", "GeoIP2-City-Test.mmdb");

describe("openGeo", () => {
  test("finds the city database and opens it on the first location lookup", () => {
    const geo = openGeo([city], []);
    expect(geo.city).toBe(city);
    expect(geo.asn).toBeNull();
    expect(geo.lookup.network("81.2.69.160")).toEqual({ asn: null, asOrg: null });
    expect(geo.lookup.location("81.2.69.160")).toMatchObject({ country: "GB", city: "London" });
  });

  test("answers empty locations without a city database", () => {
    const geo = openGeo([], []);
    expect(geo.city).toBeNull();
    expect(geo.lookup.location("81.2.69.160").country).toBeNull();
    expect(geo.loadMs).toBe(0);
  });
});
