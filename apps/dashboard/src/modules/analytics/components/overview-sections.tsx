"use client";

import type { ProjectScope } from "@spoar/client";
import { keepPreviousData, useQueries } from "@tanstack/react-query";
import { Link } from "@/shared/ui/link";

import { useReadOf } from "@/shared/query/read";
import type { Prefetchable } from "@/shared/query/read";
import { ChartIllustration, EmptyState } from "@/shared/ui/empty-state";

import { formatMetric } from "../format";
import { sumPoints } from "../logs";
import { metricPath, metricViews } from "../metrics";
import { outcomesQuery, statsQuery, timeseriesQuery, topListQuery } from "../queries";
import { viewQuery, withFilter } from "../view-state";
import type { FilterDimension, ViewState } from "../view-state";
import { useTopList } from "./breakdown-sections";
import { ChangeBadge } from "./change-badge";
import { DeviceDonut } from "./device-donut";
import { SeriesChart } from "./series-chart";
import { Sparkline } from "./sparkline";
import { TopList } from "./top-list";

type Props = { scope: ProjectScope; state: ViewState; base: string; path: string };

const tileViews = metricViews.slice(0, 4);

const topLists = [
  { dimension: "page", title: "Top paths" },
  { dimension: "host", title: "Top hosts" },
  { dimension: "referrer_domain", title: "Top referrers" },
  { dimension: "browser", title: "Top browsers" },
  { dimension: "os", title: "Top operating systems" },
  { dimension: "channel", title: "Top channels" },
] as const satisfies readonly { dimension: FilterDimension; title: string }[];

const topRows = 12;
const countryRows = 10;
const deviceRows = 5;

function CardSkeleton({ height }: { height: number }) {
  return <div className="skeleton" style={{ height }} aria-hidden="true" />;
}

function filterHref(path: string, state: ViewState, dimension: FilterDimension) {
  return (value: string) => `${path}${viewQuery(withFilter(state, dimension, value))}`;
}

/**
 * @name useOutcomes
 * @description Page views over time once per traffic outcome, on a key beside the scope's
 * page view series, shared by the overview bar and the log's outcome chart.
 *
 * @example
 * const outcomes = useOutcomes(scope);
 */
export function useOutcomes(scope: ProjectScope) {
  return useReadOf(outcomesQuery(scope));
}

/**
 * @name overviewReads
 * @description Every read the traffic overview makes on a scope, for warming the cache before a
 * navigation to it.
 *
 * @example
 * prefetchReads(queryClient, overviewReads(scope));
 */
export function overviewReads(scope: ProjectScope): Prefetchable[] {
  return [
    statsQuery(scope),
    ...tileViews.map((view) => timeseriesQuery(scope, view.series)),
    timeseriesQuery(scope, "pageviews"),
    topListQuery(scope, "device", "pageviews", deviceRows),
    topListQuery(scope, "country", "pageviews", countryRows),
    outcomesQuery(scope),
    ...topLists.map((list) => topListQuery(scope, list.dimension, "pageviews", topRows)),
  ];
}

export function KpiTiles({ scope, state, base }: Pick<Props, "scope" | "state" | "base">) {
  const stats = useReadOf(statsQuery(scope));
  const series = useQueries({
    queries: tileViews.map((view) => ({
      ...timeseriesQuery(scope, view.series),
      placeholderData: keepPreviousData,
    })),
  });
  if (stats.data === undefined) {
    return (
      <div className="kpi-row">
        {tileViews.map((view) => (
          <CardSkeleton key={view.slug} height={132} />
        ))}
      </div>
    );
  }
  const data = stats.data.ok ? stats.data.value.data : null;
  return (
    <div className="kpi-row">
      {tileViews.map((view, index) => {
        const stat = data ? data[view.stat] : null;
        const read = series[index]?.data;
        return (
          <Link
            key={view.slug}
            href={`${metricPath(base, view)}${viewQuery(state)}`}
            className="kpi-tile"
          >
            <span className="text-xs text-muted">{view.label}</span>
            <span className="flex items-baseline gap-2">
              <span className="kpi-value">
                {stat ? formatMetric(stat.value, view.format, true) : "–"}
              </span>
              <ChangeBadge change={stat?.change ?? null} lowerIsBetter={view.lowerIsBetter} />
            </span>
            <Sparkline points={read?.ok ? read.value.data : []} />
          </Link>
        );
      })}
    </div>
  );
}

export function TrafficSection({ scope }: Pick<Props, "scope">) {
  const series = useReadOf(timeseriesQuery(scope, "pageviews"));
  if (series.data === undefined) return <CardSkeleton height={328} />;
  const read = series.data;
  if (!read.ok) {
    return <p className="text-sm text-err">Could not read the series: {read.error.message}</p>;
  }
  const total = sumPoints(read.value.data);
  return (
    <section className="card-section">
      <h2 className="card-title">Page views over time</h2>
      {total === 0 ? (
        <EmptyState
          title="No page views in this range"
          description="Page views appear here once the site sends events."
          illustration={<ChartIllustration />}
        />
      ) : (
        <>
          <p className="flex items-center gap-1.5 text-xs">
            <span className="size-2 rounded-full bg-[var(--series-1)]" />
            <span className="text-muted">Page views</span>
            <span className="font-medium tabular-nums">{formatMetric(total, "count")}</span>
          </p>
          <SeriesChart
            series={[{ label: "Page views", points: read.value.data }]}
            format="count"
            interval={read.value.interval}
            label="Page views"
          />
        </>
      )}
    </section>
  );
}

export function DeviceSection({ scope, state, path }: Omit<Props, "base">) {
  const devices = useTopList(scope, "device", "pageviews", deviceRows);
  if (devices.data === undefined) return <CardSkeleton height={300} />;
  const read = devices.data;
  return (
    <section className="card-section">
      <h2 className="card-title">Page views by device type</h2>
      {read.ok ? (
        <DeviceDonut rows={read.value.data} hrefFor={filterHref(path, state, "device")} />
      ) : (
        <p className="text-sm text-err">{read.error}</p>
      )}
    </section>
  );
}

export function CountrySection({ scope, state, path, base }: Props) {
  const countries = useTopList(scope, "country", "pageviews", countryRows);
  if (countries.data === undefined) return <CardSkeleton height={300} />;
  const read = countries.data;
  return (
    <section className="card-section">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="card-title">Page views by country</h2>
        <Link href={`${base}${viewQuery(state)}`} className="text-xs text-link underline">
          Open map
        </Link>
      </header>
      {read.ok ? (
        <TopList
          dimension="country"
          rows={read.value.data}
          count="pageviews"
          hrefFor={filterHref(path, state, "country")}
        />
      ) : (
        <p className="text-sm text-err">{read.error}</p>
      )}
    </section>
  );
}

export function OutcomeBar({ scope }: Pick<Props, "scope">) {
  const outcomes = useOutcomes(scope);
  if (outcomes.data === undefined) return <CardSkeleton height={108} />;
  const read = outcomes.data;
  if (!read.ok) return <p className="text-sm text-err">{read.error}</p>;
  const parts = read.value.series.map((entry) => ({ ...entry, total: sumPoints(entry.points) }));
  const total = parts.reduce((sum, part) => sum + part.total, 0);
  return (
    <section className="card-section">
      <h2 className="card-title">Traffic outcomes</h2>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Legend">
        {parts.map((part, order) => (
          <li key={part.outcome} className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ background: `var(--series-${order + 1})` }}
            />
            <span className="text-muted">{part.label}</span>
            <span className="font-medium tabular-nums">{formatMetric(part.total, "count")}</span>
          </li>
        ))}
      </ul>
      <div className="outcome-bar" aria-hidden="true">
        {total > 0
          ? parts.map((part, order) => (
              <span
                key={part.outcome}
                style={{
                  width: `${(part.total / total) * 100}%`,
                  background: `var(--series-${order + 1})`,
                }}
              />
            ))
          : null}
      </div>
    </section>
  );
}

type TopCardProps = Omit<Props, "base"> & { dimension: FilterDimension; title: string };

function TopCard({ scope, state, path, dimension, title }: TopCardProps) {
  const list = useTopList(scope, dimension, "pageviews", topRows);
  if (list.data === undefined) return <CardSkeleton height={360} />;
  const read = list.data;
  return (
    <section className="card card-section">
      {read.ok ? (
        <TopList
          title={title}
          dimension={dimension}
          rows={read.value.data}
          count="pageviews"
          hrefFor={filterHref(path, state, dimension)}
        />
      ) : (
        <p className="text-sm text-err">
          {title}: {read.error}
        </p>
      )}
    </section>
  );
}

export function TopGrid(props: Omit<Props, "base">) {
  return (
    <div className="top-grid">
      {topLists.map((list) => (
        <TopCard key={list.dimension} {...props} dimension={list.dimension} title={list.title} />
      ))}
    </div>
  );
}
