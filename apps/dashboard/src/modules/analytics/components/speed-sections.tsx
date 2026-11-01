"use client";

import type { ProjectScope } from "@spoar/client";
import { Link } from "@/shared/ui/link";

import { useSession } from "@/modules/session/use-session";
import { GhostSection } from "@/modules/shell/components/ghost";
import { prefetchReads, useReadOf } from "@/shared/query/read";
import type { QueryClient } from "@tanstack/react-query";
import { EmptyState, IconStack } from "@/shared/ui/empty-state";
import { GaugeIcon } from "@/shared/ui/icons";

import { formatDimensionValue, formatMetric } from "../format";
import {
  annotationsQuery,
  speedElementsQuery,
  speedRoutesQuery,
  speedSeriesQuery,
  speedSummaryQuery,
} from "../queries";
import { rateScore, rateVital, vitalViews } from "../speed";
import type { VitalView } from "../speed";
import { viewQuery, withFilter } from "../view-state";
import type { ViewState } from "../view-state";
import { AddAnnotation } from "./add-annotation";
import { RatingBadge } from "./rating-badge";
import { SeriesChart } from "./series-chart";
import type { ChartSeries } from "./series-chart";
import { ShareBar } from "./share-bar";

type Props = {
  scope: ProjectScope;
  view: VitalView;
  state: ViewState;
  path: string;
};

type SummaryProps = Props & { project: string };

const routeLimit = 10;

function routeHref(path: string, state: ViewState, route: string) {
  return `${path}${viewQuery(withFilter(state, "route", route))}`;
}

function vitalCell(view: VitalView, value: number | null) {
  if (value === null) return <span className="text-muted">–</span>;
  return (
    <span className={`tabular-nums vital-${rateVital(view, value)}`}>
      {formatMetric(value, view.format)}
    </span>
  );
}

/**
 * @name useSpeedSummary
 * @description The speed summary of a view, on the key the vitals rail and the summary section
 * share, so the two read it once.
 *
 * @example
 * const summary = useSpeedSummary(scope, state);
 */
export function useSpeedSummary(scope: ProjectScope, state: ViewState) {
  return useReadOf(speedSummaryQuery(scope, state));
}

/**
 * @name prefetchSpeed
 * @description Warms the speed page's reads for one view.
 *
 * @example
 * prefetchSpeed(queryClient, scope, state, vitalView("inp"));
 */
export function prefetchSpeed(
  client: QueryClient,
  scope: ProjectScope,
  state: ViewState,
  view: VitalView,
) {
  prefetchReads(client, [
    speedSummaryQuery(scope, state),
    speedSeriesQuery(scope, state, view),
    annotationsQuery(scope),
    speedRoutesQuery(scope, state, routeLimit),
    speedElementsQuery(scope, state, view, routeLimit),
  ]);
}

export function SpeedSummary({ scope, view, state, project }: SummaryProps) {
  const summary = useSpeedSummary(scope, state);
  const series = useReadOf(speedSeriesQuery(scope, state, view));
  const annotations = useReadOf(annotationsQuery(scope));
  const editable = useSession().isAdmin;
  if (summary.data === undefined || series.data === undefined) {
    return <GhostSection kind="chart" height={424} />;
  }
  const data = summary.data.ok ? summary.data.value.data : null;
  const metric = data?.metrics[view.slug] ?? null;
  const read = series.data;
  const chart: ChartSeries[] = read.ok
    ? [{ label: `${view.short} p${state.percentile}`, points: read.value.data }]
    : [];
  const measured = read.ok ? read.value.data.some((point) => point.value !== null) : false;
  return (
    <section className="panel-section grid gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-base font-semibold">
            {view.label} at p{state.percentile}
          </h2>
          <p className="text-sm text-muted">{view.description}</p>
        </div>
        {editable ? <AddAnnotation project={project} /> : null}
      </header>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-0.5">
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <span className="size-2 rounded-full bg-[var(--series-1)]" />
            {view.short} p{state.percentile}
          </span>
          <span className="flex items-baseline gap-2">
            <span className="metric-value">
              {metric?.value === null || metric === null
                ? "–"
                : formatMetric(metric.value, view.format)}
            </span>
            {metric ? <RatingBadge rating={metric.rating} /> : null}
          </span>
        </div>
        <p className="font-mono text-xs text-muted">
          Good up to {formatMetric(view.good, view.format)}, poor above{" "}
          {formatMetric(view.poor, view.format)}
          {metric ? ` · ${formatMetric(metric.samples, "count")} samples` : ""}
        </p>
      </div>
      {metric ? <ShareBar shares={metric.shares} detailed /> : null}
      {!read.ok ? (
        <p className="text-sm text-err">Could not read the series: {read.error.message}</p>
      ) : !measured ? (
        <p className="py-16 text-center text-sm text-muted">
          No {view.short} samples in this range. Buckets need 20 samples to show a value.
        </p>
      ) : (
        <SeriesChart
          series={chart}
          format={view.format}
          interval={read.value.interval}
          label={view.label}
          thresholds={[
            { value: view.good, label: "Good" },
            { value: view.poor, label: "Poor" },
          ]}
          annotations={annotations.data?.ok ? annotations.data.value.data : []}
          project={project}
          editable={editable}
        />
      )}
    </section>
  );
}

export function SpeedRoutes({ scope, view, state, path }: Props) {
  const routes = useReadOf(speedRoutesQuery(scope, state, routeLimit));
  if (routes.data === undefined) return <GhostSection kind="list" height={282} rows={5} />;
  const read = routes.data;
  return (
    <section className="panel-section grid gap-4">
      <header className="grid gap-1">
        <h2 className="text-base font-semibold">Routes</h2>
        <p className="text-sm text-muted">
          Worst score first, at p{state.percentile}. Click a route to filter every view on it.
        </p>
      </header>
      {!read.ok ? (
        <p className="text-sm text-err">Could not read routes: {read.error.message}</p>
      ) : read.value.data.length === 0 ? (
        <EmptyState
          title="No routes with samples"
          description="No route has a speed sample in this range."
          illustration={<IconStack icon={<GaugeIcon />} />}
        />
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Route</th>
                <th scope="col" className="text-right">
                  Score
                </th>
                {vitalViews.map((vital) => (
                  <th
                    key={vital.slug}
                    scope="col"
                    className={`text-right ${vital.slug === view.slug ? "text-fg" : ""}`}
                  >
                    {vital.short}
                  </th>
                ))}
                <th scope="col" className="text-right">
                  Samples
                </th>
              </tr>
            </thead>
            <tbody>
              {read.value.data.map((row) => (
                <tr key={row.route}>
                  <td className="max-w-[28ch] truncate font-mono text-xs">
                    <Link
                      href={routeHref(path, state, row.route)}
                      title={`Filter by ${row.route}`}
                      className="hover:underline"
                    >
                      {row.route}
                    </Link>
                  </td>
                  <td className="text-right tabular-nums">
                    {row.score === null ? (
                      <span className="text-muted">–</span>
                    ) : (
                      <span className={`vital-${rateScore(row.score)}`}>{row.score}</span>
                    )}
                  </td>
                  {vitalViews.map((vital) => (
                    <td key={vital.slug} className="text-right">
                      {vitalCell(vital, row[vital.slug])}
                    </td>
                  ))}
                  <td className="text-right tabular-nums text-muted">
                    {formatMetric(row.samples, "count")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function SpeedElements({ scope, view, state, path }: Props) {
  const elements = useReadOf(speedElementsQuery(scope, state, view, routeLimit));
  if (elements.data === undefined) return <GhostSection kind="list" height={240} rows={4} />;
  const read = elements.data;
  return (
    <section className="panel-section grid gap-4">
      <header className="grid gap-1">
        <h2 className="text-base font-semibold">Slow elements for {view.short}</h2>
        <p className="text-sm text-muted">
          The elements web-vitals blamed in needs-improvement and poor samples, most samples first.
        </p>
      </header>
      {!read.ok ? (
        <p className="text-sm text-err">Could not read elements: {read.error.message}</p>
      ) : read.value.data.length === 0 ? (
        <EmptyState
          title="No slow elements"
          description={`No element has 20 slow ${view.short} samples in this range.`}
          illustration={<IconStack icon={<GaugeIcon />} />}
        />
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Element</th>
                <th scope="col">Route</th>
                <th scope="col" className="text-right">
                  p{state.percentile}
                </th>
                <th scope="col" className="text-right">
                  Samples
                </th>
              </tr>
            </thead>
            <tbody>
              {read.value.data.map((row) => (
                <tr key={`${row.route} ${row.selector}`}>
                  <td className="max-w-[36ch] truncate font-mono text-xs" title={row.selector}>
                    {row.selector}
                  </td>
                  <td className="max-w-[24ch] truncate font-mono text-xs">
                    <Link
                      href={routeHref(path, state, row.route)}
                      title={`Filter by ${formatDimensionValue("route", row.route)}`}
                      className="hover:underline"
                    >
                      {row.route}
                    </Link>
                  </td>
                  <td className="text-right">{vitalCell(view, row.value)}</td>
                  <td className="text-right tabular-nums text-muted">
                    {formatMetric(row.samples, "count")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
