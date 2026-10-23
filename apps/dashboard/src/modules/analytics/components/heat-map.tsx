import type { BreakdownRow } from "@spoar/contract";

import { formatMetric } from "../format";
import type { CountMetric } from "../metrics";
import { countryCenter } from "../world-centers";
import world from "../world-shapes.json";

type Props = { rows: BreakdownRow[]; count: CountMetric };

const minRadius = 9;
const spreadRadius = 40;

export function HeatMap({ rows, count }: Props) {
  const points = rows.flatMap((row) => {
    const centre = countryCenter(row.value);
    const value = row[count] ?? 0;
    return centre && value > 0 ? [{ centre, value }] : [];
  });
  const max = Math.max(1, ...points.map((point) => point.value));
  return (
    <figure className="heat-map">
      <svg
        viewBox={`0 0 ${world.width} ${world.height}`}
        role="img"
        aria-label="Heat map of visitors by country"
      >
        <defs>
          <radialGradient id="heat-glow">
            <stop offset="0" className="heat-stop" stopOpacity="0.9" />
            <stop offset="0.4" className="heat-stop" stopOpacity="0.4" />
            <stop offset="1" className="heat-stop" stopOpacity="0" />
          </radialGradient>
        </defs>
        {world.shapes.map((shape) => (
          <path key={`${shape.code}${shape.name}`} d={shape.path} className="map-land" />
        ))}
        {points.map(({ centre, value }) => (
          <g key={centre.code}>
            <title>{`${centre.name}: ${formatMetric(value, "count")}`}</title>
            <circle
              cx={centre.x}
              cy={centre.y}
              r={minRadius + Math.sqrt(value / max) * spreadRadius}
              fill="url(#heat-glow)"
            />
            <circle cx={centre.x} cy={centre.y} r={2.5} className="heat-core" />
          </g>
        ))}
      </svg>
    </figure>
  );
}
