import type { TimeseriesPoint } from "@spoar/contract";
import { useId } from "react";

type Props = { points: TimeseriesPoint[] };

const width = 140;
const height = 32;

export function Sparkline({ points }: Props) {
  const gradientId = useId();
  if (points.length < 2) return <div className="h-8" />;
  const max = Math.max(...points.map((point) => point.value), 1);
  const step = width / (points.length - 1);
  const line = points
    .map((point, index) => {
      const x = index * step;
      const y = height - 1 - (point.value / max) * (height - 2);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-8 w-full"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--series-1)" stopOpacity={0.25} />
          <stop offset="1" stopColor="var(--series-1)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} stroke="none" />
      <path
        d={line}
        fill="none"
        stroke="var(--series-1)"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
