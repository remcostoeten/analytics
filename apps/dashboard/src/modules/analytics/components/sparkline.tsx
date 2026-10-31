import type { TimeseriesPoint } from "@spoar/contract";

type Props = { points: TimeseriesPoint[] };

type Step = 0 | 1 | 2 | 3 | 4 | 5;

const rows = 6;
const densities = [32, 52];
const steps: Step[] = [0, 1, 2, 3, 4, 5];
const trail: Step[] = [4, 2];
const latestTrail: Step[] = [5, 3];

function resample(values: number[], columns: number) {
  if (values.length >= columns) {
    return Array.from({ length: columns }, (_, column) => {
      const from = Math.floor((column * values.length) / columns);
      const to = Math.max(from + 1, Math.floor(((column + 1) * values.length) / columns));
      const bucket = values.slice(from, to);
      return bucket.reduce((sum, value) => sum + value, 0) / bucket.length;
    });
  }
  return Array.from({ length: columns }, (_, column) => {
    const position = (column / (columns - 1)) * (values.length - 1);
    const left = Math.floor(position);
    const right = Math.min(left + 1, values.length - 1);
    const weight = position - left;
    return (values[left] ?? 0) * (1 - weight) + (values[right] ?? 0) * weight;
  });
}

function dotPaths(values: number[], columns: number) {
  const levels = resample(values, columns);
  const min = Math.min(...levels);
  const range = Math.max(...levels) - min;
  const paths: string[][] = steps.map(() => []);
  let latest = "";
  levels.forEach((value, column) => {
    const ratio = range > 0 ? (value - min) / range : 0.5;
    const level = 1 + Math.round(ratio * (rows - 1));
    const last = column === columns - 1;
    const tones = last ? latestTrail : trail;
    for (let row = 0; row < rows; row += 1) {
      const dot = `M${column + 0.5} ${rows - row - 0.5}h0`;
      const depth = level - 1 - row;
      if (last && depth === 0) latest = dot;
      else paths[depth >= 0 ? (tones[depth] ?? 0) : 0]?.push(dot);
    }
  });
  return { steps: paths.map((segments) => segments.join("")), latest };
}

export function Sparkline({ points }: Props) {
  if (points.length < 2) return <div className="h-8" />;
  const values = points.map((point) => point.value);
  return (
    <div className="dot-spark" aria-hidden="true">
      {densities.map((columns) => {
        const dots = dotPaths(values, columns);
        return (
          <svg
            key={columns}
            viewBox={`0 0 ${columns} ${rows}`}
            preserveAspectRatio="none"
            data-columns={columns}
          >
            {dots.steps.map((d, step) =>
              d ? <path key={step} d={d} className={`dot-step-${step}`} /> : null,
            )}
            <path d={dots.latest} className="dot-latest" />
          </svg>
        );
      })}
    </div>
  );
}
