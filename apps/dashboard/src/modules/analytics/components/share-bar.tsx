import type { MetricSummary } from "@spoar/contract";

type Props = { shares: MetricSummary["shares"]; detailed?: boolean };

const parts = [
  { key: "good", label: "Good" },
  { key: "needsImprovement", label: "Needs improvement" },
  { key: "poor", label: "Poor" },
] as const satisfies readonly { key: keyof MetricSummary["shares"]; label: string }[];

function percent(share: number) {
  return `${Math.round(share * 100)}%`;
}

export function ShareBar({ shares, detailed = false }: Props) {
  const total = parts.reduce((sum, part) => sum + shares[part.key], 0);
  return (
    <div className="grid gap-1.5">
      <div className="share-bar" aria-hidden="true">
        {total > 0
          ? parts.map((part) => (
              <span
                key={part.key}
                className={`share-${part.key}`}
                style={{ width: `${(shares[part.key] / total) * 100}%` }}
              />
            ))
          : null}
      </div>
      {detailed ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {parts.map((part) => (
            <li key={part.key} className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full share-${part.key}`} />
              <span className="text-muted">{part.label}</span>
              <span className="tabular-nums">{percent(shares[part.key])}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
