import type { ProjectScope } from "@spoar/client";
import type { SpeedResponse } from "@spoar/contract";
import Link from "next/link";

import { formatDimensionValue, formatMetric } from "../format";
import { rateScore, rateVital, speedDevice, speedInterval, vitalViews } from "../speed";
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

type SummaryProps = Props & {
  summary: Promise<SpeedResponse["data"] | null>;
  project: string;
  canAnnotate: boolean;
};

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

export async function SpeedSummary({
  scope,
  view,
  state,
  summary,
  project,
  canAnnotate,
}: SummaryProps) {
  const [data, series, annotations] = await Promise.all([
    summary,
    scope.speedTimeseries({
      metric: view.slug,
      percentile: state.percentile,
      device: speedDevice(state.filters),
      interval: speedInterval(state.period),
    }),
    scope.annotations({ limit: 100 }),
  ]);
  const metric = data?.metrics[view.slug] ?? null;
  const chart: ChartSeries[] = series.ok
    ? [{ label: `${view.short} p${state.percentile}`, points: series.value.data }]
    : [];
  const measured = series.ok ? series.value.data.some((point) => point.value !== null) : false;
  return (
    <section className="panel-section grid gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-base font-semibold">
            {view.label} at p{state.percentile}
          </h2>
          <p className="text-sm text-muted">{view.description}</p>
        </div>
        {canAnnotate ? <AddAnnotation project={project} /> : null}
      </header>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-0.5">
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <span className="size-2 rounded-full bg-[var(--series-1)]" />
            {view.short} p{state.percentile}
          </span>
          <span className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">
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
      {!series.ok ? (
        <p className="text-sm text-err">Could not read the series: {series.error.message}</p>
      ) : !measured ? (
        <p className="py-16 text-center text-sm text-muted">
          No {view.short} samples in this range. Buckets need 20 samples to show a value.
        </p>
      ) : (
        <SeriesChart
          series={chart}
          format={view.format}
          interval={series.value.interval}
          label={view.label}
          thresholds={[
            { value: view.good, label: "Good" },
            { value: view.poor, label: "Poor" },
          ]}
          annotations={annotations.ok ? annotations.value.data : []}
          project={project}
          editable={canAnnotate}
        />
      )}
    </section>
  );
}

const routeLimit = 10;

export async function SpeedRoutes({ scope, view, state, path }: Props) {
  const read = await scope.speedRoutes({
    percentile: state.percentile,
    device: speedDevice(state.filters),
    limit: routeLimit,
  });
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
        <p className="py-6 text-center text-sm text-muted">No routes with samples in this range</p>
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
                      prefetch={false}
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

export async function SpeedElements({ scope, view, state, path }: Props) {
  const read = await scope.speedElements({
    metric: view.slug,
    percentile: state.percentile,
    device: speedDevice(state.filters),
    limit: routeLimit,
  });
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
        <p className="py-6 text-center text-sm text-muted">
          No element has 20 slow {view.short} samples in this range
        </p>
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
                      prefetch={false}
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
