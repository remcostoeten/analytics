"use client";

import type { ShowcaseProject } from "@/lib/showcase";

export function Change({
  value,
  invert = false,
}: {
  value: ShowcaseProject["change"];
  invert?: boolean;
}) {
  if (value === null || !Number.isFinite(value)) return null;
  const rounded = Math.round(value * 100);
  const good = invert ? rounded < 0 : rounded > 0;
  const tone =
    rounded === 0 ? "bg-fg/6 text-muted" : good ? "bg-ok/12 text-ok" : "bg-err/10 text-err";
  return (
    <span className={`rounded-full px-1.5 py-0.5 font-mono text-[0.62rem] tabular-nums ${tone}`}>
      {rounded > 0 ? "+" : ""}
      {rounded}%
    </span>
  );
}

const sparkWidth = 300;
const sparkHeight = 64;

function sparkPoints(values: number[]) {
  const max = Math.max(1, ...values);
  const step = (sparkWidth - 8) / Math.max(1, values.length - 1);
  return values.map((value, index) => ({
    x: index * step,
    y: sparkHeight - 8 - (value / max) * (sparkHeight - 16),
  }));
}

function smoothPath(points: { x: number; y: number }[]) {
  return points
    .map((point, index) => {
      if (index === 0) return `M${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
      const previous = points[index - 1];
      const mid = (previous.x + point.x) / 2;
      return `C${mid.toFixed(1)} ${previous.y.toFixed(1)} ${mid.toFixed(1)} ${point.y.toFixed(1)} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    })
    .join(" ");
}

export function Sparkline({
  values,
  gradient,
  className = "mt-5 h-16",
}: {
  values: number[];
  gradient: string;
  className?: string;
}) {
  if (values.length < 2) return <span className={`block ${className}`} />;
  const points = sparkPoints(values);
  const line = smoothPath(points);
  const last = points[points.length - 1];
  return (
    <span aria-hidden="true" className={`relative block ${className}`}>
      <svg
        viewBox={`0 0 ${sparkWidth} ${sparkHeight}`}
        preserveAspectRatio="none"
        className="size-full overflow-visible"
      >
        <defs>
          <linearGradient id={`${gradient}-stroke`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="var(--spark-from)" />
            <stop offset="1" stopColor="var(--accent)" />
          </linearGradient>
          <linearGradient id={`${gradient}-fill`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.18" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${line} L${last.x} ${sparkHeight} L0 ${sparkHeight} Z`}
          fill={`url(#${gradient}-fill)`}
          className="spark-fill"
        />
        <path
          d={line}
          fill="none"
          stroke={`url(#${gradient}-stroke)`}
          strokeWidth="2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          className="spark-line"
        />
      </svg>
      <span
        className="spark-dot absolute size-2 -translate-1/2 rounded-full bg-accent"
        style={{ left: `${(last.x / sparkWidth) * 100}%`, top: `${(last.y / sparkHeight) * 100}%` }}
      />
    </span>
  );
}
