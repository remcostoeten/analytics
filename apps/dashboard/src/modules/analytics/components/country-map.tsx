import type { BreakdownRow } from "@spoar/contract";
import Link from "next/link";

import { formatMetric } from "../format";
import type { CountMetric } from "../metrics";
import world from "../world-shapes.json";

type Props = {
  rows: BreakdownRow[];
  count: CountMetric;
  hrefFor: (value: string) => string;
};

function fill(share: number) {
  const strength = Math.round(20 + share * 80);
  return `color-mix(in srgb, var(--series-1) ${strength}%, var(--map-land))`;
}

export function CountryMap({ rows, count, hrefFor }: Props) {
  const values = new Map(rows.map((row) => [row.value, row[count] ?? 0]));
  const max = Math.max(1, ...values.values());
  return (
    <figure className="country-map">
      <svg
        viewBox={`0 0 ${world.width} ${world.height}`}
        role="img"
        aria-label="Map of countries by count"
      >
        {world.shapes.map((shape) => {
          const value = values.get(shape.code) ?? 0;
          if (value === 0) {
            return (
              <path key={`${shape.code}${shape.name}`} d={shape.path} className="map-land">
                <title>{shape.name}</title>
              </path>
            );
          }
          return (
            <Link
              key={shape.code}
              href={hrefFor(shape.code)}
              aria-label={`Filter by ${shape.name}`}
              prefetch={false}
            >
              <path d={shape.path} className="map-country" style={{ fill: fill(value / max) }}>
                <title>{`${shape.name}: ${formatMetric(value, "count")}`}</title>
              </path>
            </Link>
          );
        })}
      </svg>
      <figcaption className="map-scale">
        <span className="tabular-nums">0</span>
        <span className="map-scale-bar" aria-hidden="true" />
        <span className="tabular-nums">{formatMetric(max, "count")}</span>
      </figcaption>
    </figure>
  );
}
