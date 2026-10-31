"use client";

import type { BreakdownRow } from "@spoar/contract";
import { useRef, useState } from "react";
import type { PointerEvent } from "react";

import { formatMetric } from "../format";
import type { CountMetric } from "../metrics";
import { countryCenter } from "../world-centers";
import world from "../world-shapes.json";

type Props = {
  rows: BreakdownRow[];
  count: CountMetric;
  active?: string;
  onSelect?: (code: string) => void;
};

type Point = readonly [number, number];

type Ring = { points: Point[]; minX: number; maxX: number; minY: number; maxY: number };

type Lit = {
  code: string;
  name: string;
  dots: string;
  value: number;
  level: number;
  rank: number;
  share: number;
};

const pitch = 7;
const dash = `0 ${pitch}`;
const rowHeight = pitch * 0.866;
const levels = [1, 2, 3, 4, 5] as const;
const tipOffset = 14;
const countLabels = {
  visitors: "visitors",
  pageviews: "page views",
  sessions: "sessions",
} as const;
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

function percent(share: number) {
  if (share > 0 && share < 0.01) return "<1%";
  return `${Math.round(share * 100)}%`;
}

export function HeatMap({ rows, count, active, onSelect }: Props) {
  const tooltip = useRef<HTMLDivElement>(null);
  const [code, setCode] = useState("");
  const [open, setOpen] = useState(false);
  const values = rows.flatMap((row) => {
    const value = row[count] ?? 0;
    return value > 0 ? [{ code: row.value, value }] : [];
  });
  const max = Math.max(1, ...values.map((entry) => entry.value));
  const total = Math.max(
    1,
    values.reduce((sum, entry) => sum + entry.value, 0),
  );
  const lit = values
    .flatMap(({ code: countryCode, value }): Lit[] => {
      const centre = countryCenter(countryCode);
      if (!centre) return [];
      const dots = dotsByCountry.get(countryCode) ?? [];
      return [
        {
          code: countryCode,
          name: centre.name,
          dots: dotPath(dots.length > 0 ? dots : [[centre.x, centre.y]]),
          value,
          level: level(value, max),
          rank: 0,
          share: value / total,
        },
      ];
    })
    .toSorted((left, right) => right.value - left.value)
    .map((country, index) => ({ ...country, rank: index + 1 }))
    .toReversed();
  const top = lit.at(-1);
  const shown = lit.find((country) => country.code === code);

  function track(event: PointerEvent<HTMLElement>) {
    const target = event.target instanceof Element ? event.target.closest("[data-code]") : null;
    const next = target?.getAttribute("data-code") ?? "";
    setOpen(next !== "");
    if (next !== "") setCode(next);
    const tip = tooltip.current;
    if (!tip || next === "") return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    const flip = x + tipOffset + tip.offsetWidth > box.width;
    const left = flip ? x - tipOffset - tip.offsetWidth : x + tipOffset;
    const upper = Math.max(0, Math.min(y + tipOffset, box.height - tip.offsetHeight));
    tip.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(upper)}px, 0)`;
  }

  return (
    <figure
      className="heat-map"
      data-active={open}
      data-selectable={onSelect !== undefined}
      onPointerMove={track}
      onPointerDown={track}
      onPointerLeave={() => setOpen(false)}
      onClick={(event) => {
        const target = event.target instanceof Element ? event.target.closest("[data-code]") : null;
        const picked = target?.getAttribute("data-code");
        if (picked && onSelect) onSelect(picked);
      }}
    >
      <svg
        viewBox={`0 0 ${world.width} ${world.height}`}
        role="img"
        aria-label="Map of visitors by country"
      >
        <path d={landDots} className="heat-land" strokeDasharray={dash} />
        {lit.map((country) => (
          <g
            key={country.code}
            data-code={country.code}
            data-hovered={open && country.code === code}
            data-selected={country.code === active}
            className={`heat-country heat-level-${country.level}`}
          >
            <path d={country.dots} className="heat-hit" strokeWidth={pitch} />
            <path d={country.dots} className="heat-dots" strokeDasharray={dash} />
          </g>
        ))}
      </svg>
      <ul className="sr-only">
        {lit.toReversed().map((country) => (
          <li key={country.code}>
            {`${country.name}: ${formatMetric(country.value, "count")} ${countLabels[count]}`}
          </li>
        ))}
      </ul>
      <div ref={tooltip} className="heat-tooltip" data-open={open} aria-hidden="true">
        {shown ? (
          <>
            <p className="heat-tooltip-name">{shown.name}</p>
            <p className="heat-tooltip-value">
              <span className="tabular-nums">{formatMetric(shown.value, "count")}</span>
              <span className="heat-tooltip-unit">{countLabels[count]}</span>
            </p>
            <p className="heat-tooltip-meta tabular-nums">
              {`${percent(shown.share)} of total, #${shown.rank} of ${lit.length}`}
            </p>
            {onSelect ? (
              <p className="heat-tooltip-meta">
                {shown.code === active ? "Click to clear the filter" : "Click to filter"}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
      {top ? (
        <figcaption className="heat-scale">
          <span className="tabular-nums">1</span>
          <span className="heat-scale-steps" aria-hidden="true">
            {levels.map((step) => (
              <span key={step} className={`heat-level-${step}`} />
            ))}
          </span>
          <span className="tabular-nums">{formatMetric(max, "count")}</span>
          <span className="heat-scale-top">{`Most from ${top.name} (${percent(top.share)})`}</span>
        </figcaption>
      ) : null}
    </figure>
  );
}
