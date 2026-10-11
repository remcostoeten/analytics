import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { geoMercator, geoPath } from "d3-geo";
import { numericToAlpha2 } from "i18n-iso-countries";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";

type WorldTopology = Topology<{ countries: GeometryCollection<{ name: string }> }>;

const width = 960;
const height = 560;
const antarctica = "010";
const source = fileURLToPath(import.meta.resolve("world-atlas/countries-110m.json"));
const target = join(
  import.meta.dir,
  "..",
  "apps",
  "dashboard",
  "src",
  "modules",
  "analytics",
  "world-shapes.json",
);

const topology: WorldTopology = JSON.parse(readFileSync(source, "utf8"));
const collection = feature(topology, topology.objects.countries);
const land = {
  ...collection,
  features: collection.features.filter((country) => country.id !== antarctica),
};
const draw = geoPath(
  geoMercator().fitExtent(
    [
      [0, 0],
      [width, height],
    ],
    land,
  ),
).digits(1);

const shapes = land.features.flatMap((country) => {
  const path = draw(country);
  const code = country.id === undefined ? undefined : numericToAlpha2(country.id);
  return path ? [{ code: code ?? "", name: country.properties.name, path }] : [];
});

writeFileSync(target, `${JSON.stringify({ width, height, shapes })}\n`);
console.log(`Wrote ${shapes.length} countries to ${target}`);
