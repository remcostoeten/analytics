import Link from "next/link";

import { formatDimensionValue, formatMetric } from "../format";
import type { MetricView } from "../metrics";
import { readSplitSeries } from "../reads";
import type { ProjectScope } from "@spoar/client";
import { viewQuery } from "../view-state";
import type { FilterDimension, ViewState } from "../view-state";
import { siteUrl } from "@/shared/config/site";

import { AddAnnotation } from "./add-annotation";
import { ChangeBadge } from "./change-badge";
import { EmptyState } from "./empty-state";
import { SeriesChart } from "./series-chart";
import { SplitMenu } from "./split-menu";
import type { ChartPoint, ChartSeries } from "./series-chart";

type Props = {
  scope: ProjectScope;
  view: MetricView;
  state: ViewState;
  path: string;
  headline: Promise<Headline>;
  project: string;
  canAnnotate: Promise<boolean>;
};

export type Headline = { total: number | null; change: number | null };

type Split = { value: FilterDimension | null; label: string };

const splits = [
  { value: null, label: "All" },
  { value: "referrer_domain", label: "Referrer" },
  { value: "host", label: "Host" },
  { value: "country", label: "Country" },
  { value: "page", label: "Path" },
  { value: "browser", label: "Browser" },
] as const satisfies readonly Split[];

const moreSplits = [
  { value: "os", label: "Operating system" },
  { value: "device", label: "Device type" },
  { value: "channel", label: "Channel" },
] as const satisfies readonly Split[];

const seriesLimit = 5;

function isQuiet(series: ChartSeries[]) {
  return series.every((entry) => entry.points.every((point) => !point.value));
}

async function readSeries(scope: ProjectScope, view: MetricView, split: FilterDimension | null) {
  if (split === null) {
    const read = await scope.timeseries(view.series, { compare: "previous" });
    if (!read.ok) return { error: read.error.message } as const;
    const series: ChartSeries[] = [{ label: view.label, points: read.value.data }];
    const previous = read.value.data.map((point) => ({
      bucket: point.bucket,
      value: point.previous ?? null,
    }));
    return { series, previous, totals: [], interval: read.value.interval } as const;
  }
  const read = await readSplitSeries(scope, view, split, seriesLimit);
  if (!read.ok) return { error: read.error } as const;
  const series: ChartSeries[] = read.value.map((entry) => ({
    label: formatDimensionValue(split, entry.value),
    points: entry.series.data,
  }));
  const totals = read.value.map((entry) => (view.format === "count" ? entry.total : null));
  const previous: ChartPoint[] = [];
  return {
    series,
    previous,
    totals,
    interval: read.value[0]?.series.interval ?? "day",
  } as const;
}

export async function SummarySection({
  scope,
  view,
  state,
  path,
  headline,
  project,
  canAnnotate,
}: Props) {
  const [read, annotations, { total, change }, editable] = await Promise.all([
    readSeries(scope, view, state.split),
    scope.annotations({ limit: 100 }),
    headline,
    canAnnotate,
  ]);
  const hasFilters = Object.keys(state.filters).length > 0;
  return (
    <section className="panel-section grid gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-base font-semibold">{view.label} summary</h2>
          <p className="text-sm text-muted">{view.description}</p>
        </div>
        {editable ? <AddAnnotation project={project} /> : null}
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
        <SplitMenu
          options={moreSplits.map((split) => ({
            label: split.label,
            href: `${path}${viewQuery({ ...state, split: split.value })}`,
            active: state.split === split.value,
          }))}
        />
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
          <ul className="legend" aria-label="Legend">
            <li className="legend-cell">
              <span className="flex items-center gap-1.5 text-xs text-muted">
                {state.split === null ? (
                  <span className="size-2 rounded-full bg-[var(--series-1)]" />
                ) : null}
                Total {view.label.toLowerCase()}
              </span>
              <span className="flex items-baseline gap-2">
                <span className="metric-value">
                  {total === null ? "–" : formatMetric(total, view.format)}
                </span>
                <ChangeBadge change={change} lowerIsBetter={view.lowerIsBetter} />
              </span>
            </li>
            {read.previous.some((point) => point.value) ? (
              <li className="legend-cell self-end">
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  <span className="h-0 w-3 border-t border-dashed border-muted" />
                  Previous period
                </span>
              </li>
            ) : null}
            {state.split !== null
              ? read.series.map((entry, order) => {
                  const value = read.totals[order] ?? null;
                  return (
                    <li key={entry.label} className="legend-cell">
                      <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ background: `var(--series-${order + 1})` }}
                        />
                        <span className="truncate">{entry.label}</span>
                      </span>
                      {value !== null ? (
                        <span className="metric-value">{formatMetric(value, view.format)}</span>
                      ) : null}
                    </li>
                  );
                })
              : null}
          </ul>
          {read.series.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">No data in this range</p>
          ) : (
            <SeriesChart
              series={read.series}
              format={view.format}
              interval={read.interval}
              previous={read.previous}
              label={view.label}
              annotations={annotations.ok ? annotations.value.data : []}
              project={project}
              editable={editable}
            />
          )}
        </>
      )}
    </section>
  );
}
