import type { ProjectScope } from "@spoar/client";

import { formatMetric } from "../format";
import { readOutcomes, sumPoints } from "../logs";
import { EmptyState } from "./empty-state";
import { SeriesChart } from "./series-chart";

type Props = { scope: ProjectScope };

export async function OutcomeSection({ scope }: Props) {
  const read = await readOutcomes(scope);
  return (
    <section className="panel-section grid gap-3">
      <h2 className="text-sm font-medium">Page views by outcome over time</h2>
      {!read.ok ? (
        <p className="text-sm text-err">Could not read the series: {read.error}</p>
      ) : read.value.series.every((entry) => sumPoints(entry.points) === 0) ? (
        <EmptyState title="No page views in this range">
          Widen the time range or remove a filter.
        </EmptyState>
      ) : (
        <>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Legend">
            {read.value.series.map((entry, order) => (
              <li key={entry.outcome} className="flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ background: `var(--series-${order + 1})` }}
                />
                <span className="text-muted">{entry.label}</span>
                <span className="font-medium tabular-nums">
                  {formatMetric(sumPoints(entry.points), "count")}
                </span>
              </li>
            ))}
          </ul>
          <SeriesChart
            series={read.value.series.map((entry) => ({
              label: entry.label,
              points: entry.points,
            }))}
            format="count"
            interval={read.value.interval}
            label="Page views"
          />
        </>
      )}
    </section>
  );
}
