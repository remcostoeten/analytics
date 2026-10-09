"use client";

import type { Interval } from "@spoar/contract";
import { useEffect, useRef, useState } from "react";

import { formatMetric } from "../format";
import type { MetricFormat } from "../metrics";

export type ChartSeries = { label: string; points: { bucket: string; value: number }[] };

type Props = {
  series: ChartSeries[];
  format: MetricFormat;
  interval: Interval;
  label: string;
};

const height = 240;
const pad = { top: 12, right: 12, bottom: 28, left: 52 };

function niceStep(peak: number, format: MetricFormat) {
  const raw = Math.max(peak / 4, format === "count" ? 1 : Number.EPSILON);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const factor = [1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= raw) ?? 10;
  const step = factor * magnitude;
  return format === "count" ? Math.max(1, Math.round(step)) : step;
}

function bucketLabel(bucket: string, interval: Interval, long: boolean) {
  const date = new Date(bucket);
  if (interval === "hour") {
    const time = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    return long
      ? `${date.toLocaleDateString("en-US", { day: "numeric", month: "short" })} ${time}`
      : time;
  }
  if (interval === "month")
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

export function SeriesChart({ series, format, interval, label }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const buckets = series[0]?.points.map((point) => point.bucket) ?? [];
  const peak = Math.max(0, ...series.flatMap((entry) => entry.points.map((point) => point.value)));
  const tickStep = niceStep(peak, format);
  const top = Math.max(tickStep, Math.ceil(peak / tickStep) * tickStep);
  const plotWidth = Math.max(width - pad.left - pad.right, 0);
  const plotHeight = height - pad.top - pad.bottom;
  const step = buckets.length > 1 ? plotWidth / (buckets.length - 1) : 0;
  const ticks = Array.from(
    { length: Math.round(top / tickStep) + 1 },
    (_, index) => index * tickStep,
  );
  const labelEvery = Math.max(
    1,
    Math.ceil(buckets.length / Math.max(2, Math.floor(plotWidth / 90))),
  );

  function x(index: number) {
    return pad.left + index * step;
  }

  function y(value: number) {
    return pad.top + plotHeight - (value / top) * plotHeight;
  }

  const hovered = hover === null ? null : buckets[hover];

  return (
    <div ref={frame} className="relative w-full" style={{ height }}>
      {width > 0 && buckets.length > 0 ? (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${label} over time`}
          className="block touch-none"
          onPointerLeave={() => setHover(null)}
          onPointerMove={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            const index = step > 0 ? Math.round((event.clientX - box.left - pad.left) / step) : 0;
            setHover(Math.min(Math.max(index, 0), buckets.length - 1));
          }}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="var(--grid)"
                strokeWidth={1}
              />
              <text
                x={pad.left - 8}
                y={y(tick)}
                dy="0.32em"
                textAnchor="end"
                className="fill-muted font-mono text-[10px]"
              >
                {formatMetric(tick, format, true)}
              </text>
            </g>
          ))}
          {buckets.map((bucket, index) =>
            index % labelEvery === 0 ? (
              <text
                key={bucket}
                x={x(index)}
                y={height - 8}
                textAnchor="middle"
                className="fill-muted font-mono text-[10px]"
              >
                {bucketLabel(bucket, interval, false)}
              </text>
            ) : null,
          )}
          {series.map((entry, order) => (
            <path
              key={entry.label}
              d={entry.points
                .map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point.value)}`)
                .join(" ")}
              fill="none"
              stroke={`var(--series-${order + 1})`}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          ))}
          {hover !== null ? (
            <g>
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={pad.top}
                y2={pad.top + plotHeight}
                stroke="var(--muted)"
                strokeDasharray="3 3"
              />
              {series.map((entry, order) => {
                const point = entry.points[hover];
                return point ? (
                  <circle
                    key={entry.label}
                    cx={x(hover)}
                    cy={y(point.value)}
                    r={4}
                    fill={`var(--series-${order + 1})`}
                    stroke="var(--surface)"
                    strokeWidth={2}
                  />
                ) : null;
              })}
            </g>
          ) : null}
        </svg>
      ) : null}
      {hover !== null && hovered ? (
        <div
          className="chart-tooltip"
          style={{
            left: Math.min(x(hover) + 12, Math.max(width - 200, 0)),
            top: pad.top,
          }}
        >
          <p className="mb-1 font-mono text-[11px] text-muted">
            {bucketLabel(hovered, interval, true)}
          </p>
          {series.map((entry, order) => (
            <p key={entry.label} className="flex items-center gap-2 text-xs">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ background: `var(--series-${order + 1})` }}
              />
              <span className="min-w-0 flex-1 truncate">{entry.label}</span>
              <span className="font-medium tabular-nums">
                {formatMetric(entry.points[hover]?.value ?? 0, format)}
              </span>
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
