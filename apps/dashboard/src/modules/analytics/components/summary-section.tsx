import Link from "next/link";

import { formatDimensionValue, formatMetric } from "../format";
import type { MetricView } from "../metrics";
import { readSplitSeries } from "../reads";
import type { ProjectScope } from "@spoar/client";
import { viewQuery } from "../view-state";
import type { FilterDimension, ViewState } from "../view-state";
import { siteUrl } from "@/shared/config/site";

import { AddAnnotation } from "./add-annotation";
import { EmptyState } from "./empty-state";
import { SeriesChart } from "./series-chart";
import type { ChartSeries } from "./series-chart";

type Props = {
  scope: ProjectScope;
  view: MetricView;
  state: ViewState;
  path: string;
  total: number | null;
  project: string;
  canAnnotate: boolean;
};

const splits = [
  { value: null, label: "All" },
  { value: "referrer_domain", label: "Referrer" },
  { value: "host", label: "Host" },
  { value: "country", label: "Country" },
  { value: "page", label: "Path" },
  { value: "browser", label: "Browser" },
] as const satisfies readonly { value: FilterDimension | null; label: string }[];

const seriesLimit = 5;

function isQuiet(series: ChartSeries[]) {
  return series.every((entry) => entry.points.every((point) => !point.value));
}

async function readSeries(scope: ProjectScope, view: MetricView, split: FilterDimension | null) {
  if (split === null) {
    const read = await scope.timeseries(view.series);
    if (!read.ok) return { error: read.error.message } as const;
    const series: ChartSeries[] = [{ label: view.label, points: read.value.data }];
    return { series, interval: read.value.interval } as const;
  }
  const read = await readSplitSeries(scope, view, split, seriesLimit);
  if (!read.ok) return { error: read.error } as const;
  const series: ChartSeries[] = read.value.map((entry) => ({
    label: formatDimensionValue(split, entry.value),
    points: entry.series.data,
  }));
  return { series, interval: read.value[0]?.series.interval ?? "day" } as const;
}

export async function SummarySection({
  scope,
  view,
  state,
  path,
  total,
  project,
  canAnnotate,
}: Props) {
  const [read, annotations] = await Promise.all([
    readSeries(scope, view, state.split),
    scope.annotations({ limit: 100 }),
  ]);
  const hasFilters = Object.keys(state.filters).length > 0;
  return (
    <section className="panel-section grid gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-base font-semibold">{view.label} summary</h2>
          <p className="text-sm text-muted">{view.description}</p>
        </div>
        {canAnnotate ? <AddAnnotation project={project} /> : null}
      </header>

      <nav aria-label="Split by" className="tabs">
        {splits.map((split) => (
          <Link
            key={split.label}
            href={`${path}${viewQuery({ ...state, split: split.value })}`}
            aria-current={state.split === split.value ? "page" : undefined}
            className="tab"
            scroll={false}
            prefetch={false}
          >
            {split.label}
          </Link>
        ))}
      </nav>

      {"error" in read ? (
        <p className="text-sm text-err">Could not read the series: {read.error}</p>
      ) : isQuiet(read.series) ? (
        <EmptyState title={`No ${view.label.toLowerCase()} in this range`}>
          {hasFilters ? (
            "Remove a filter or widen the time range to see traffic."
          ) : (
            <>
              Once the site sends events they show up here. New site?{" "}
              <a
                href={`${siteUrl()}/docs/getting-started/quick-start`}
                className="text-link underline"
              >
                Install the SDK
              </a>
              .
            </>
          )}
        </EmptyState>
      ) : (
        <>
          {state.split !== null ? (
            <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Legend">
              {read.series.map((entry, order) => (
                <li key={entry.label} className="grid gap-0.5">
                  <span className="flex items-center gap-1.5 text-xs text-muted">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: `var(--series-${order + 1})` }}
                    />
                    {entry.label}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid gap-0.5">
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <span className="size-2 rounded-full bg-[var(--series-1)]" />
                Total {view.label.toLowerCase()}
              </span>
              <span className="text-2xl font-semibold tabular-nums">
                {total === null ? "–" : formatMetric(total, view.format)}
              </span>
            </div>
          )}
          {read.series.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">No data in this range</p>
          ) : (
            <SeriesChart
              series={read.series}
              format={view.format}
              interval={read.interval}
              label={view.label}
              annotations={annotations.ok ? annotations.value.data : []}
              project={project}
              editable={canAnnotate}
            />
          )}
        </>
      )}
    </section>
  );
}
