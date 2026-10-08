import type { ProjectScope } from "@spoar/client";
import type { TimeseriesPoint } from "@spoar/contract";

import { formatBucket, formatCount } from "../format";
import { useRead } from "../use-read";
import { ReadFrame } from "./read-frame";

type Props = { scope: ProjectScope; scopeKey: string };

const width = 800;
const height = 220;
const padding = { top: 12, right: 12, bottom: 28, left: 40 };

function path(
  points: TimeseriesPoint[],
  pick: (point: TimeseriesPoint) => number | undefined,
  max: number,
) {
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const step = points.length > 1 ? innerWidth / (points.length - 1) : 0;
  return points
    .map((point, index) => {
      const value = pick(point);
      if (value === undefined) return null;
      const x = padding.left + index * step;
      const y = padding.top + innerHeight - (max === 0 ? 0 : (value / max) * innerHeight);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .filter((segment): segment is string => segment !== null)
    .join(" ");
}

function anchorFor(index: number, length: number): "start" | "middle" | "end" {
  if (index === 0) return "start";
  return index === length - 1 ? "end" : "middle";
}

function ticks(points: TimeseriesPoint[], interval: string) {
  const every = Math.max(1, Math.ceil(points.length / 6));
  return points
    .map((point, index) => ({ point, index }))
    .filter(({ index }) => index % every === 0 || index === points.length - 1)
    .filter(
      ({ index }, position, all) =>
        position === 0 || index - (all[position - 1]?.index ?? 0) > every / 2,
    )
    .map(({ point, index }) => ({
      index,
      label: formatBucket(point.bucket, interval),
      anchor: anchorFor(index, points.length),
    }));
}

export function TimeseriesChart({ scope, scopeKey }: Props) {
  const series = useRead(() => scope.timeseries("visitors", { compare: "previous" }), [scopeKey]);
  return (
    <ReadFrame
      title="Visitors over time"
      read={series}
      isEmpty={(value) => value.data.every((point) => point.value === 0 && !point.previous)}
      empty="No visitors in this range."
      skeleton={<div className="chart skeleton" style={{ height }} />}
    >
      {(value) => {
        const max = Math.max(
          1,
          ...value.data.flatMap((point) => [point.value, point.previous ?? 0]),
        );
        const innerWidth = width - padding.left - padding.right;
        const step = value.data.length > 1 ? innerWidth / (value.data.length - 1) : 0;
        return (
          <figure className="chart">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              role="img"
              aria-label="Visitors per bucket, with the previous range dashed"
            >
              {[0, 0.5, 1].map((fraction) => {
                const y = padding.top + (height - padding.top - padding.bottom) * (1 - fraction);
                return (
                  <g key={fraction}>
                    <line
                      x1={padding.left}
                      x2={width - padding.right}
                      y1={y}
                      y2={y}
                      className="grid"
                    />
                    <text x={padding.left - 8} y={y + 4} textAnchor="end" className="axis">
                      {formatCount(Math.round(max * fraction))}
                    </text>
                  </g>
                );
              })}
              <path
                d={path(value.data, (point) => point.previous, max)}
                className="line previous"
              />
              <path d={path(value.data, (point) => point.value, max)} className="line current" />
              {ticks(value.data, value.interval).map((tick) => (
                <text
                  key={tick.index}
                  x={padding.left + tick.index * step}
                  y={height - 8}
                  textAnchor={tick.anchor}
                  className="axis"
                >
                  {tick.label}
                </text>
              ))}
            </svg>
            <figcaption>
              <span className="legend current">This range</span>
              <span className="legend previous">Previous range</span>
            </figcaption>
          </figure>
        );
      }}
    </ReadFrame>
  );
}
