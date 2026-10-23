import { describe, expect, test } from "bun:test";

import { countryCenter } from "../src/modules/analytics/world-centers";
import world from "../src/modules/analytics/world-shapes.json";

describe("countryCenter", () => {
  test("places a country inside the map", () => {
    const centre = countryCenter("NL");
    expect(centre).not.toBeNull();
    expect(centre?.x).toBeGreaterThan(0);
    expect(centre?.x).toBeLessThan(world.width);
    expect(centre?.y).toBeGreaterThan(0);
    expect(centre?.y).toBeLessThan(world.height);
  });

  test("puts Europe left of Asia and north of Africa", () => {
    const nl = countryCenter("NL");
    const cn = countryCenter("CN");
    const ma = countryCenter("MA");
    expect(nl && cn && nl.x < cn.x).toBe(true);
    expect(nl && ma && nl.y < ma.y).toBe(true);
  });

  test("returns null for an unknown code", () => {
    expect(countryCenter("ZZ")).toBeNull();
  });
});
