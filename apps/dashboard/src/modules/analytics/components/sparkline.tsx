import type { TimeseriesPoint } from "@spoar/contract";

type Props = { points: TimeseriesPoint[] };

const width = 140;
const height = 32;

export function Sparkline({ points }: Props) {
  if (points.length < 2) return <div className="h-8" />;
  const max = Math.max(...points.map((point) => point.value), 1);
  const step = width / (points.length - 1);
  const path = points
    .map((point, index) => {
      const x = index * step;
      const y = height - 1 - (point.value / max) * (height - 2);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-8 w-full"
      aria-hidden="true"
    >
      <path
        d={path}
        fill="none"
        stroke="var(--series-1)"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
