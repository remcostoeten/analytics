import type { ProjectScope, TimeseriesPoint } from "@spoar/client";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";

import { formatBucket } from "../format";
import { metrics } from "../metrics";
import type { MetricKey } from "../metrics";
import { useRead } from "../use-read";
import { Failure } from "./read-frame";

type Props = { scope: ProjectScope; scopeKey: string; metric: MetricKey };

const height = 260;
const padding = { top: 16, right: 8, bottom: 28, left: 44 };

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(Math.round(entries[0]?.contentRect.width ?? 0));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function line(
  points: TimeseriesPoint[],
  pick: (point: TimeseriesPoint) => number | undefined,
  x: (index: number) => number,
  y: (value: number) => number,
) {
  return points
    .map((point, index) => {
      const value = pick(point);
      if (value === undefined) return null;
      return `${index === 0 ? "M" : "L"}${x(index).toFixed(1)},${y(value).toFixed(1)}`;
    })
    .filter((segment): segment is string => segment !== null)
    .join(" ");
}

function tickIndexes(length: number, width: number) {
  const target = Math.max(2, Math.floor(width / 110));
  const every = Math.max(1, Math.ceil(length / target));
  return Array.from({ length }, (_, index) => index).filter(
    (index) => index % every === 0 && length - 1 - index >= every / 2,
  );
}

export function TimeseriesChart({ scope, scopeKey, metric }: Props) {
  const series = useRead(
    () => scope.timeseries(metric, { compare: "previous" }),
    [scopeKey, metric],
  );
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const config = metrics.find((item) => item.key === metric) ?? metrics[0];
  const data = series.value?.data ?? [];
  const interval = series.value?.interval ?? "day";
  const failed = series.status === "error" && series.value === null;

  const innerWidth = Math.max(0, width - padding.left - padding.right);
  const innerHeight = height - padding.top - padding.bottom;
  const max = Math.max(1e-9, ...data.flatMap((point) => [point.value, point.previous ?? 0]));
  const step = data.length > 1 ? innerWidth / (data.length - 1) : 0;
  function x(index: number) {
    return padding.left + index * step;
  }
  function y(value: number) {
    return padding.top + innerHeight - (value / max) * innerHeight;
  }
  const baseline = padding.top + innerHeight;
  const current = line(data, (point) => point.value, x, y);
  const area =
    current === "" ? "" : `${current} L${x(data.length - 1)},${baseline} L${x(0)},${baseline} Z`;
  const point = hover === null ? undefined : data[hover];

  function onMove(event: PointerEvent<HTMLDivElement>) {
    if (data.length === 0 || step === 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const index = Math.round((event.clientX - bounds.left - padding.left) / step);
    setHover(Math.min(data.length - 1, Math.max(0, index)));
  }

  return (
    <div className="chart-wrap">
      {failed ? <Failure error={series.error} onRetry={series.retry} /> : null}
      <div
        ref={ref}
        className={`chart${series.status === "loading" ? " is-loading" : ""}`}
        style={{ height }}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {width > 0 && data.length > 0 ? (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`${config.label} per ${interval}, with the previous range dashed`}
          >
            <defs>
              <linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" className="area-top" />
                <stop offset="1" className="area-bottom" />
              </linearGradient>
            </defs>
            {[0, 0.5, 1].map((fraction) => {
              const gridY = y(max * fraction);
              return (
                <g key={fraction}>
                  <line
                    x1={padding.left}
                    x2={width - padding.right}
                    y1={gridY}
                    y2={gridY}
                    className="grid-line"
                  />
                  <text x={padding.left - 8} y={gridY + 4} textAnchor="end" className="axis">
                    {config.format(max * fraction)}
                  </text>
                </g>
              );
            })}
            <path d={line(data, (item) => item.previous, x, y)} className="line previous" />
            <path d={area} fill="url(#area-fill)" />
            <path d={current} className="line current" />
            {tickIndexes(data.length, width).map((index) => (
              <text
                key={index}
                x={x(index)}
                y={height - 8}
                textAnchor={index === 0 ? "start" : "middle"}
                className="axis"
              >
                {formatBucket(data[index]?.bucket ?? "", interval)}
              </text>
            ))}
            {point && hover !== null ? (
              <g>
                <line
                  x1={x(hover)}
                  x2={x(hover)}
                  y1={padding.top}
                  y2={baseline}
                  className="cursor"
                />
                <circle cx={x(hover)} cy={y(point.value)} r={4} className="dot" />
              </g>
            ) : null}
          </svg>
        ) : null}
        {point && hover !== null ? (
          <div
            className="tooltip"
            style={{
              left: Math.min(Math.max(x(hover), 80), Math.max(80, width - 80)),
              top: padding.top,
            }}
          >
            <span className="tooltip-date">{formatBucket(point.bucket, interval)}</span>
            <span className="tooltip-row current">
              <span>This range</span>
              <strong>{config.format(point.value)}</strong>
            </span>
            {point.previous === undefined ? null : (
              <span className="tooltip-row previous">
                <span>Previous</span>
                <strong>{config.format(point.previous)}</strong>
              </span>
            )}
          </div>
        ) : null}
      </div>
      <div className="legend-row">
        <span className="legend current">This range</span>
        <span className="legend previous">Previous range</span>
      </div>
    </div>
  );
}
