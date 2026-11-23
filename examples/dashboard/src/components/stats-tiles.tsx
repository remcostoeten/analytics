import type { ProjectScope } from "@spoar/client";

import { formatChange } from "../format";
import { metrics } from "../metrics";
import type { Metric, MetricKey } from "../metrics";
import { useRead } from "../use-read";
import { Failure } from "./read-frame";

type Props = {
  scope: ProjectScope;
  scopeKey: string;
  selected: MetricKey;
  onSelect: (metric: MetricKey) => void;
};

function direction(change: number | null, invert: boolean | undefined) {
  if (change === null || change === 0) return "flat";
  const up = change > 0;
  return up !== Boolean(invert) ? "good" : "bad";
}

function tileLabel(metric: Metric) {
  return `Chart ${metric.label.toLowerCase()}`;
}

export function StatsTiles({ scope, scopeKey, selected, onSelect }: Props) {
  const stats = useRead(() => scope.stats(), [scopeKey]);
  if (stats.status === "error" && stats.value === null) {
    return <Failure error={stats.error} onRetry={stats.retry} />;
  }
  return (
    <div className="tiles" role="group" aria-label="Metrics">
      {metrics.map((metric) => {
        const compared = stats.value?.data[metric.stat];
        return (
          <button
            key={metric.key}
            type="button"
            className={`tile${selected === metric.key ? " active" : ""}`}
            aria-pressed={selected === metric.key}
            aria-label={tileLabel(metric)}
            data-spoar-click="metric"
            data-spoar-prop-metric={metric.key}
            onClick={() => onSelect(metric.key)}
          >
            <span className="tile-label">{metric.label}</span>
            <span className={`tile-value${compared ? "" : " skeleton"}`}>
              {compared ? metric.format(compared.value) : "0"}
            </span>
            <span
              className={`change ${compared ? direction(compared.change, metric.invert) : "skeleton"}`}
            >
              {compared ? formatChange(compared.change) : "+0%"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
