"use client";

import type { ProjectScope } from "@spoar/client";
import { Link } from "@/shared/ui/link";

import { useSession } from "@/modules/session/use-session";
import { SectionSkeleton } from "@/modules/shell/components/skeletons";
import { useReadOf } from "@/shared/query/read";
import type { Prefetchable } from "@/shared/query/read";
import { siteUrl } from "@/shared/config/site";
import { ChartIllustration, EmptyState, SearchIllustration } from "@/shared/ui/empty-state";

import { formatDimensionValue, formatMetric } from "../format";
import type { MetricView } from "../metrics";
import { annotationsQuery, comparedSeriesQuery, splitSeriesQuery, statsQuery } from "../queries";
import { hasFilters, viewQuery } from "../view-state";
import type { FilterDimension, ViewState } from "../view-state";
import { AddAnnotation } from "./add-annotation";
import { ChangeBadge } from "./change-badge";
import { SeriesChart } from "./series-chart";
import type { ChartPoint, ChartSeries } from "./series-chart";
import { SplitMenu } from "./split-menu";

type Props = {
  scope: ProjectScope;
  view: MetricView;
  state: ViewState;
  path: string;
  project: string;
};

type Split = { value: FilterDimension | null; label: string };

type Series =
  | { error: string }
  | { series: ChartSeries[]; previous: ChartPoint[]; totals: (number | null)[]; interval: string };

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

function isQuiet(series: ChartSeries[]) {
  return series.every((entry) => entry.points.every((point) => !point.value));
}

/**
 * @name summaryReads
 * @description The summary chart's reads for a view: the headline stats, the series (whole or
 * split) and the annotations, for warming the cache before a navigation to it.
 *
 * @example
 * prefetchReads(queryClient, summaryReads(scope, view, state.split));
 */
export function summaryReads(
  scope: ProjectScope,
  view: MetricView,
  split: FilterDimension | null,
): Prefetchable[] {
  return [
    statsQuery(scope),
    split === null ? comparedSeriesQuery(scope, view.series) : splitSeriesQuery(scope, view, split),
    annotationsQuery(scope),
  ];
}

function useSeries(scope: ProjectScope, view: MetricView, split: FilterDimension | null) {
  const whole = useReadOf(comparedSeriesQuery(scope, view.series), { enabled: split === null });
  const splitRead = useReadOf(splitSeriesQuery(scope, view, split ?? "page"), {
    enabled: split !== null,
  });
  if (split === null) {
    if (whole.data === undefined) return undefined;
    const read = whole.data;
    if (!read.ok) return { error: read.error.message };
    const series: ChartSeries[] = [{ label: view.label, points: read.value.data }];
    const previous = read.value.data.map((point) => ({
      bucket: point.bucket,
      value: point.previous ?? null,
    }));
    return { series, previous, totals: [], interval: read.value.interval };
  }
  if (splitRead.data === undefined) return undefined;
  const read = splitRead.data;
  if (!read.ok) return { error: read.error };
  const series: ChartSeries[] = read.value.map((entry) => ({
    label: formatDimensionValue(split, entry.value),
    points: entry.series.data,
  }));
  const totals = read.value.map((entry) => (view.format === "count" ? entry.total : null));
  return { series, previous: [], totals, interval: read.value[0]?.series.interval ?? "day" };
}

function isDayInterval(interval: string): interval is "hour" | "day" | "month" {
  return interval === "hour" || interval === "day" || interval === "month";
}

export function SummarySection({ scope, view, state, path, project }: Props) {
  const read: Series | undefined = useSeries(scope, view, state.split);
  const stats = useReadOf(statsQuery(scope));
  const annotations = useReadOf(annotationsQuery(scope));
  const editable = useSession().isAdmin;
  if (read === undefined || stats.data === undefined) return <SectionSkeleton height={430} />;
  const headline = stats.data.ok ? stats.data.value.data[view.stat] : null;
  const total = headline?.value ?? null;
  const change = headline?.change ?? null;
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
        <EmptyState
          title={`No ${view.label.toLowerCase()} in this range`}
          description={
            hasFilters(state)
              ? "Remove a filter or widen the time range to see traffic."
              : "Once the site sends events they show up here."
          }
          illustration={hasFilters(state) ? <SearchIllustration /> : <ChartIllustration />}
        >
          {hasFilters(state) ? (
            <Link href={`${path}${viewQuery({ ...state, filters: {} })}`} className="ghost-button">
              Clear filters
            </Link>
          ) : (
            <a href={`${siteUrl()}/docs/getting-started/quick-start`} className="solid-button">
              Install the SDK
            </a>
          )}
        </EmptyState>
      ) : (
        <>
          <ul className="legend" aria-label="Legend">
            <li className="legend-cell">
              <span className="flex items-center gap-1.5 text-xs text-muted">
                {state.split === null ? (
                  <span className="size-2 rounded-full bg-(--series-1)" />
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
            <EmptyState
              title="No data in this range"
              description="Widen the time range to see the series."
              illustration={<ChartIllustration />}
            />
          ) : (
            <SeriesChart
              series={read.series}
              format={view.format}
              interval={isDayInterval(read.interval) ? read.interval : "day"}
              previous={read.previous}
              label={view.label}
              annotations={annotations.data?.ok ? annotations.data.value.data : []}
              project={project}
              editable={editable}
            />
          )}
        </>
      )}
    </section>
  );
}
