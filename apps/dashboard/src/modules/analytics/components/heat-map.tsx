import type { BreakdownRow } from "@spoar/contract";

import { formatMetric } from "../format";
import type { CountMetric } from "../metrics";
import { countryCenter } from "../world-centers";
import world from "../world-shapes.json";

type Props = { rows: BreakdownRow[]; count: CountMetric };

type Point = readonly [number, number];

type Ring = { points: Point[]; minX: number; maxX: number; minY: number; maxY: number };

type Lit = { code: string; name: string; dots: string; value: number; level: number };

const pitch = 7;
const dash = `0 ${pitch}`;
const rowHeight = pitch * 0.866;
const levels = [1, 2, 3, 4, 5] as const;
const numberPattern = /-?\d+(?:\.\d+)?/g;

function parseRings(path: string): Ring[] {
  return path
    .split("M")
    .filter((ring) => ring !== "")
    .map((ring) => {
      const numbers = (ring.match(numberPattern) ?? []).map(Number);
      const points: Point[] = [];
      for (let index = 0; index + 1 < numbers.length; index += 2) {
        points.push([numbers[index] ?? 0, numbers[index + 1] ?? 0]);
      }
      const xs = points.map((point) => point[0]);
      const ys = points.map((point) => point[1]);
      return {
        points,
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
      };
    });
}

function insideRing(ring: Ring, x: number, y: number) {
  if (x < ring.minX || x > ring.maxX || y < ring.minY || y > ring.maxY) return false;
  let inside = false;
  ring.points.forEach((point, index) => {
    const previous = ring.points[(index || ring.points.length) - 1] ?? point;
    const crosses = point[1] > y !== previous[1] > y;
    if (
      crosses &&
      x < ((previous[0] - point[0]) * (y - point[1])) / (previous[1] - point[1]) + point[0]
    ) {
      inside = !inside;
    }
  });
  return inside;
}

function shapeDots(path: string): Point[] {
  const rings = parseRings(path);
  const minY = Math.min(...rings.map((ring) => ring.minY));
  const maxY = Math.max(...rings.map((ring) => ring.maxY));
  const minX = Math.min(...rings.map((ring) => ring.minX));
  const maxX = Math.max(...rings.map((ring) => ring.maxX));
  const dots: Point[] = [];
  for (let row = Math.floor(minY / rowHeight); row * rowHeight <= maxY; row += 1) {
    const y = (row + 0.5) * rowHeight;
    const offset = row % 2 === 0 ? 0 : pitch / 2;
    for (let column = Math.floor(minX / pitch) - 1; column * pitch <= maxX; column += 1) {
      const x = (column + 0.5) * pitch + offset;
      const hits = rings.filter((ring) => insideRing(ring, x, y)).length;
      if (hits % 2 === 1) dots.push([x, y]);
    }
  }
  return dots;
}

function round(value: number) {
  return Number(value.toFixed(1));
}

function dotPath(dots: readonly Point[]) {
  const sorted = dots.toSorted((left, right) => left[1] - right[1] || left[0] - right[0]);
  const runs: { x: number; y: number; length: number }[] = [];
  for (const [x, y] of sorted) {
    const run = runs.at(-1);
    if (run && run.y === y && Math.abs(run.x + run.length + pitch - x) < 0.01) {
      run.length += pitch;
    } else {
      runs.push({ x, y, length: 0 });
    }
  }
  return runs.map((run) => `M${round(run.x)} ${round(run.y)}h${run.length + 0.1}`).join("");
}

const dotsByCountry = new Map<string, Point[]>();

for (const shape of world.shapes) {
  const dots = shapeDots(shape.path);
  dotsByCountry.set(shape.code, [...(dotsByCountry.get(shape.code) ?? []), ...dots]);
}

const landDots = dotPath([...dotsByCountry.values()].flat());

function level(value: number, max: number) {
  return Math.max(1, Math.ceil(Math.sqrt(value / max) * levels.length));
}

export function HeatMap({ rows, count }: Props) {
  const values = rows.flatMap((row) => {
    const value = row[count] ?? 0;
    return value > 0 ? [{ code: row.value, value }] : [];
  });
  const max = Math.max(1, ...values.map((entry) => entry.value));
  const lit = values
    .flatMap(({ code, value }): Lit[] => {
      const centre = countryCenter(code);
      if (!centre) return [];
      const dots = dotsByCountry.get(code) ?? [];
      return [
        {
          code,
          name: centre.name,
          dots: dotPath(dots.length > 0 ? dots : [[centre.x, centre.y]]),
          value,
          level: level(value, max),
        },
      ];
    })
    .toSorted((left, right) => left.value - right.value);
  const top = lit.at(-1);
  const topCentre = top ? countryCenter(top.code) : null;
  return (
    <figure className="heat-map">
      <svg
        viewBox={`0 0 ${world.width} ${world.height}`}
        role="img"
        aria-label="Map of visitors by country"
      >
        <path d={landDots} className="heat-land" strokeDasharray={dash} />
        {lit.map((country) => (
          <g key={country.code} className={`heat-country heat-level-${country.level}`}>
            <title>{`${country.name}: ${formatMetric(country.value, "count")}`}</title>
            <path d={country.dots} className="heat-hit" strokeWidth={pitch} />
            <path d={country.dots} className="heat-dots" strokeDasharray={dash} />
          </g>
        ))}
        {topCentre ? (
          <g className="heat-top" aria-hidden="true">
            <circle cx={topCentre.x} cy={topCentre.y} r={9} className="heat-ring" />
            <circle cx={topCentre.x} cy={topCentre.y} r={9} className="heat-ripple" />
          </g>
        ) : null}
      </svg>
      {top ? (
        <figcaption className="heat-scale">
          <span className="tabular-nums">1</span>
          <span className="heat-scale-steps" aria-hidden="true">
            {levels.map((step) => (
              <span key={step} className={`heat-level-${step}`} />
            ))}
          </span>
          <span className="tabular-nums">{formatMetric(max, "count")}</span>
          <span className="heat-scale-top">{`Most from ${top.name}`}</span>
        </figcaption>
      ) : null}
    </figure>
  );
}
