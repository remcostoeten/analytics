import { expect, test } from "bun:test";

import { sqlPresets } from "./sql-presets";
import { sqlVariants } from "./sql-variants";

const target = {
  project: "docs",
  endpoint: "https://api.analytics.remcostoeten.nl",
  window: { from: new Date("2026-09-10T13:37:00Z"), to: new Date("2026-10-10T13:37:00Z") },
};

test("every preset reads as SQL, a client call and a curl request", () => {
  for (const preset of sqlPresets) {
    const variants = sqlVariants(preset, target);
    expect(variants.map((variant) => variant.id)).toEqual(["sql", "client", "curl"]);
    expect(variants[0].source).toBe(preset.sql);
    expect(variants[1].source).toContain(`.project("docs")`);
    expect(variants[1].source).toContain(`.${preset.read};`);
  }
});

test("the curl body carries the preset's SQL and binds whole days", () => {
  const [pages] = sqlPresets;
  const curl = sqlVariants(pages, target)[2].source;
  expect(curl).toContain("https://api.analytics.remcostoeten.nl/v2/projects/docs/query");
  const body: { sql: string; params: { from: string; to: string } } = JSON.parse(
    curl.slice(curl.indexOf("{"), curl.lastIndexOf("}") + 1),
  );
  expect(body.sql).toBe(pages.sql.replaceAll(/\s+/g, " "));
  expect(body.params).toEqual({ from: "2026-09-10T00:00:00Z", to: "2026-10-10T00:00:00Z" });
});
