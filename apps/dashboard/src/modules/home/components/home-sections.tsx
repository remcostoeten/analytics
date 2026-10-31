"use client";

import type { AllScope, ProjectScope } from "@spoar/client";
import type { Period, PublicProject } from "@spoar/contract";
import { keepPreviousData, useQueries } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { AnimatedNumber } from "@/modules/analytics/components/animated-number";
import { ChangeBadge } from "@/modules/analytics/components/change-badge";
import { HeatMap } from "@/modules/analytics/components/heat-map";
import { RatingBadge } from "@/modules/analytics/components/rating-badge";
import { SeriesChart } from "@/modules/analytics/components/series-chart";
import type { ChartPoint, ChartSeries } from "@/modules/analytics/components/series-chart";
import { ShareBar } from "@/modules/analytics/components/share-bar";
import { formatMetric } from "@/modules/analytics/format";
import { metricViews } from "@/modules/analytics/metrics";
import { readTopList } from "@/modules/analytics/series";
import { speedDevice, vitalSummary, vitalViews } from "@/modules/analytics/speed";
import { hasFilters, periods, viewQuery } from "@/modules/analytics/view-state";
import type { FilterDimension } from "@/modules/analytics/view-state";
import { useRead } from "@/shared/query/read";
import { ChartIllustration, EmptyState } from "@/shared/ui/empty-state";
import { FilterIcon } from "@/shared/ui/icons";
import { Link } from "@/shared/ui/link";

import { homeHref, toggleHomeFilter } from "../home-state";
import type { HomeState } from "../home-state";
import { rankProjects } from "../projects";
import { OnlineCount } from "./online-count";
import { RankList } from "./rank-list";

type ScopeProps = { scope: AllScope; state: HomeState };

type TrafficProps = ScopeProps & { projects: PublicProject[] };

type VitalsProps = ScopeProps & {
  projects: PublicProject[];
  projectScope: (id: string) => ProjectScope;
};

type ProjectsProps = ScopeProps & { projects: PublicProject[] };

type RankCardProps = ScopeProps & {
  title: string;
  description: string;
  dimension: FilterDimension;
  limit: number;
};

type CardHeadProps = { title: string; description: string };

const shownVitals = vitalViews.filter((view) => ["lcp", "inp", "cls"].includes(view.slug));

const deviceRows = 4;

const expandedRows = 50;

const mapRows = 100;

const vitalProjects = 10;

const splitProjects = 5;

const minSamples = 20;

const trafficOptions = { metrics: ["visitors", "pageviews"], limit: 100 } as const;

const compareOptions = { compare: "previous" } as const;

function CardSkeleton({ height }: { height: number }) {
  return <div className="skeleton" style={{ height }} aria-hidden="true" />;
}

function periodPhrase(period: Period) {
  const label = periods.find((entry) => entry.value === period)?.label ?? period;
  return label.toLowerCase();
}

function sampleNote(samples: number) {
  const count = formatMetric(samples, "count");
  return samples < minSamples ? `${count} of ${minSamples} needed` : `${count} samples`;
}

function useAllTopList(
  scope: AllScope,
  dimension: FilterDimension,
  count: "visitors" | "pageviews" | "sessions",
  limit: number,
) {
  return useRead(scope.key("breakdown", dimension, { limit, metrics: [count] }), () =>
    readTopList(scope, dimension, count, limit),
  );
}

function CardHead({ title, description }: CardHeadProps) {
  return (
    <header className="grid gap-0.5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="text-xs text-muted">{description}</p>
    </header>
  );
}

function useProjectTraffic(scope: AllScope) {
  return useRead(scope.key("projectBreakdown", trafficOptions), () =>
    scope.projectBreakdown(trafficOptions),
  );
}

function isQuiet(series: ChartSeries[]) {
  return series.every((entry) => entry.points.every((point) => !point.value));
}

function seriesTotal(points: ChartPoint[]) {
  return points.reduce((sum, point) => sum + (point.value ?? 0), 0);
}

export function TrafficCard({ scope, state, projects }: TrafficProps) {
  const metric = state.metric;
  const splittable = state.project === null && projects.length > 1;
  const split = splittable && state.byProject;
  const stats = useRead(scope.key("stats"), () => scope.stats());
  const whole = useRead(
    scope.key("timeseries", metric.series, compareOptions),
    () => scope.timeseries(metric.series, compareOptions),
    { enabled: !split },
  );
  const traffic = useProjectTraffic(scope);
  const ranked = rankProjects(projects, traffic.data?.ok ? traffic.data.value.data : [])
    .filter((project) => project.visitors > 0)
    .slice(0, splitProjects);
  const perProject = useQueries({
    queries: (split ? ranked : []).map((project) => {
      const projectReads = scope.where({ project: project.id });
      return {
        queryKey: projectReads.key("timeseries", metric.series),
        queryFn: () => projectReads.timeseries(metric.series),
        placeholderData: keepPreviousData,
      };
    }),
  });
  if (stats.data === undefined) return <CardSkeleton height={392} />;
  const data = stats.data.ok ? stats.data.value.data : null;
  const narrowed = projects.find((project) => project.id === state.project);
  const across = narrowed
    ? narrowed.name
    : `${projects.length} ${projects.length === 1 ? "project" : "projects"}`;
  const filtered = hasFilters(state.view) || state.project !== null;

  function chart() {
    if (split) {
      if (traffic.data === undefined || perProject.some((read) => read.data === undefined)) {
        return <div className="skeleton h-[240px]" aria-hidden="true" />;
      }
      const series: ChartSeries[] = ranked.flatMap((project, index) => {
        const read = perProject[index]?.data;
        return read?.ok ? [{ label: project.name, points: read.value.data }] : [];
      });
      const interval = perProject.find((read) => read.data?.ok)?.data;
      return {
        series,
        previous: [],
        interval: interval?.ok ? interval.value.interval : "day",
      };
    }
    if (whole.data === undefined) return <div className="skeleton h-[240px]" aria-hidden="true" />;
    if (!whole.data.ok) {
      return (
        <p className="text-sm text-err">Could not read the series: {whole.data.error.message}</p>
      );
    }
    const points = whole.data.value.data;
    return {
      series: [{ label: metric.label, points }],
      previous: points.map((point) => ({ bucket: point.bucket, value: point.previous ?? null })),
      interval: whole.data.value.interval,
    };
  }

  const drawn = chart();
  return (
    <section className="card card-section">
      <nav aria-label="Metric" className="home-metrics">
        {metricViews.map((view) => {
          const stat = data?.[view.stat];
          return (
            <Link
              key={view.slug}
              href={homeHref({ ...state, metric: view })}
              scroll={false}
              aria-current={view.slug === metric.slug ? "page" : undefined}
              className="home-metric"
            >
              <span className="text-xs text-muted">{view.label}</span>
              {stat ? (
                <AnimatedNumber
                  value={stat.value}
                  format={view.format}
                  className="home-metric-value"
                />
              ) : (
                <span className="home-metric-value">–</span>
              )}
              <ChangeBadge change={stat?.change ?? null} lowerIsBetter={view.lowerIsBetter} />
            </Link>
          );
        })}
      </nav>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          {metric.label} in the {periodPhrase(state.view.period)} across {across}.
        </p>
        {splittable ? (
          <nav aria-label="Chart" className="tabs">
            <Link
              href={homeHref({ ...state, byProject: false })}
              scroll={false}
              aria-current={split ? undefined : "page"}
              className="tab"
            >
              Total
            </Link>
            <Link
              href={homeHref({ ...state, byProject: true })}
              scroll={false}
              aria-current={split ? "page" : undefined}
              className="tab"
            >
              By project
            </Link>
          </nav>
        ) : null}
      </div>
      {"series" in drawn ? (
        isQuiet(drawn.series) ? (
          <EmptyState
            title={`No ${metric.label.toLowerCase()} in this range`}
            description={
              filtered
                ? "Remove a filter or widen the time range to see traffic."
                : "Traffic from every project shows up here."
            }
            illustration={<ChartIllustration />}
          >
            {filtered ? (
              <Link
                href={homeHref({ ...state, project: null, view: { ...state.view, filters: {} } })}
                scroll={false}
                className="ghost-button"
              >
                Clear filters
              </Link>
            ) : null}
          </EmptyState>
        ) : (
          <SeriesChart
            series={drawn.series}
            previous={drawn.previous}
            format={metric.format}
            interval={drawn.interval}
            label={metric.label}
          />
        )
      ) : (
        drawn
      )}
      {split && "series" in drawn ? (
        <ul className="home-legend" aria-label="Projects in the chart">
          {ranked.map((project, order) => {
            const points = drawn.series[order]?.points ?? [];
            return (
              <li key={project.id}>
                <Link
                  href={homeHref({ ...state, project: project.id, byProject: false })}
                  scroll={false}
                  className="home-legend-item"
                  title={`Show only ${project.name}`}
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: `var(--series-${order + 1})` }}
                  />
                  <span className="truncate">{project.name}</span>
                  {metric.format === "count" ? (
                    <span className="text-muted tabular-nums">
                      {formatMetric(seriesTotal(points), "count")}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

export function OnlineCard({ scope, state }: ScopeProps) {
  const devices = useAllTopList(scope, "device", "visitors", deviceRows);
  if (devices.data === undefined) return <CardSkeleton height={392} />;
  const read = devices.data;
  return (
    <section className="card card-section">
      <header className="grid gap-1">
        <OnlineCount />
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <span className="live-dot" aria-hidden="true" />
          visitors online
        </p>
      </header>
      <div className="grid gap-2">
        <h3 className="card-title">Devices</h3>
        {read.ok ? (
          <RankList
            dimension="device"
            rows={read.value.data}
            share
            href={(value) => homeHref(toggleHomeFilter(state, "device", value))}
            active={state.view.filters.device}
          />
        ) : (
          <p className="text-sm text-err">{read.error}</p>
        )}
      </div>
    </section>
  );
}

export function ProjectsCard({ scope, state, projects }: ProjectsProps) {
  const traffic = useProjectTraffic(scope);
  if (traffic.data === undefined) return <CardSkeleton height={340} />;
  const read = traffic.data;
  const rows = rankProjects(projects, read.ok ? read.value.data : []).filter(
    (row) => state.project === null || row.id === state.project,
  );
  return (
    <section className="card card-section">
      <CardHead
        title="Projects"
        description={`Ranked by visitors in the ${periodPhrase(state.view.period)}.`}
      />
      {read.ok ? null : (
        <p className="text-sm text-err">Could not read traffic: {read.error.message}</p>
      )}
      <div className="home-scroll">
        <table className="home-table">
          <thead>
            <tr>
              <th scope="col">Project</th>
              <th scope="col" className="num">
                Visitors
              </th>
              <th scope="col" className="num">
                Views
              </th>
              <th scope="col" className="num">
                Change
              </th>
              <th scope="col" className="num">
                Speed
              </th>
              <th scope="col">
                <span className="sr-only">Filter</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const focused = row.id === state.project;
              return (
                <tr key={row.id} aria-current={focused ? "true" : undefined}>
                  <td>
                    <Link
                      href={`/projects/${encodeURIComponent(row.id)}${viewQuery(state.view)}`}
                      className="font-medium hover:underline"
                    >
                      {row.name}
                    </Link>
                    <span className="block text-xs text-muted">{row.domain}</span>
                  </td>
                  <td className="num">{formatMetric(row.visitors, "count")}</td>
                  <td className="num">{formatMetric(row.pageviews, "count")}</td>
                  <td className="num">
                    {row.change === null ? (
                      <span className="text-muted">–</span>
                    ) : (
                      <span className="flex justify-end">
                        <ChangeBadge change={row.change} lowerIsBetter={false} />
                      </span>
                    )}
                  </td>
                  <td className="num">
                    {row.speedScore === null ? (
                      <span className="text-muted">–</span>
                    ) : (
                      row.speedScore
                    )}
                  </td>
                  <td className="num">
                    <Link
                      href={homeHref({
                        ...state,
                        project: focused ? null : row.id,
                        byProject: false,
                      })}
                      scroll={false}
                      className="home-focus"
                      aria-current={focused ? "true" : undefined}
                      aria-label={
                        focused ? "Show every project" : `Show only ${row.name} on the overview`
                      }
                      title={focused ? "Show every project" : "Show only this project"}
                    >
                      <FilterIcon className="size-3.5" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function RankCard({ scope, state, title, description, dimension, limit }: RankCardProps) {
  const list = useAllTopList(scope, dimension, "visitors", Math.max(limit, expandedRows));
  if (list.data === undefined) return <CardSkeleton height={limit > 6 ? 340 : 252} />;
  const read = list.data;
  return (
    <section className="card card-section">
      <CardHead title={title} description={description} />
      {read.ok ? (
        <RankList
          dimension={dimension}
          rows={read.value.data}
          collapsed={limit}
          href={(value) => homeHref(toggleHomeFilter(state, dimension, value))}
          active={state.view.filters[dimension]}
        />
      ) : (
        <p className="text-sm text-err">{read.error}</p>
      )}
    </section>
  );
}

export function HeatMapCard({ scope, state }: ScopeProps) {
  const router = useRouter();
  const countries = useAllTopList(scope, "country", "visitors", mapRows);
  if (countries.data === undefined) return <CardSkeleton height={460} />;
  const read = countries.data;
  return (
    <section className="card card-section">
      <CardHead
        title="Visitor map"
        description={`Where visitors came from in the ${periodPhrase(state.view.period)}.`}
      />
      {read.ok ? (
        <HeatMap
          rows={read.value.data}
          count="visitors"
          active={state.view.filters.country}
          onSelect={(code) =>
            router.push(homeHref(toggleHomeFilter(state, "country", code)), { scroll: false })
          }
        />
      ) : (
        <p className="text-sm text-err">{read.error}</p>
      )}
    </section>
  );
}

export function VitalsCard({ scope, state, projects, projectScope }: VitalsProps) {
  const speedOptions = { percentile: 75, device: speedDevice(state.view.filters) } as const;
  const listed = projects
    .filter((project) => state.project === null || project.id === state.project)
    .slice(0, vitalProjects);
  const speed = useRead(scope.key("speed", speedOptions), () => scope.speed(speedOptions));
  const perProject = useQueries({
    queries: listed.map((project) => {
      const projectReads = projectScope(project.id);
      return {
        queryKey: projectReads.key("speed", speedOptions),
        queryFn: () => projectReads.speed(speedOptions),
        placeholderData: keepPreviousData,
      };
    }),
  });
  if (speed.data === undefined) return <CardSkeleton height={260} />;
  const read = speed.data;
  const data = read.ok ? read.value.data : null;
  const measured = listed
    .flatMap((project, index) => {
      const projectRead = perProject[index]?.data;
      return projectRead?.ok && projectRead.value.data.samples > 0
        ? [{ project, data: projectRead.value.data }]
        : [];
    })
    .sort((left, right) => right.data.samples - left.data.samples);
  const hasValue =
    data !== null && shownVitals.some((view) => data.metrics[view.slug].value !== null);
  const count =
    listed.length === 1 ? (listed[0]?.name ?? "1 project") : `${projects.length} projects combined`;
  return (
    <section className="card card-section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardHead
          title="Core Web Vitals"
          description={`Real visits to ${count}, ${periodPhrase(state.view.period)}, 75th percentile on ${speedOptions.device === "all" ? "all devices" : speedOptions.device}. A value needs ${minSamples} samples.`}
        />
        {data && data.score !== null ? (
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>Real Experience Score</span>
            <span className="home-figure-small text-fg">{data.score}</span>
            <RatingBadge rating={data.rating} />
          </div>
        ) : null}
      </div>
      {read.ok ? null : (
        <p className="text-sm text-err">Could not read speed: {read.error.message}</p>
      )}
      <dl className="home-vitals">
        {shownVitals.map((view) => {
          const summary = data ? vitalSummary(data, view.slug) : null;
          return (
            <div key={view.slug} className="grid content-start gap-2">
              <dt className="text-xs text-muted">
                <span className="font-medium text-fg">{view.short}</span> {view.label}
              </dt>
              <dd className="grid gap-2">
                <span className="home-figure-small">
                  {summary === null || summary.value === null
                    ? "–"
                    : formatMetric(summary.value, view.format)}
                </span>
                {summary ? <ShareBar shares={summary.shares} /> : null}
                <span className="flex items-center justify-between gap-2 text-xs text-muted">
                  <RatingBadge rating={summary?.rating ?? null} />
                  {summary ? sampleNote(summary.samples) : null}
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
      {read.ok && !hasValue ? (
        <p className="text-xs text-muted">
          {data && data.samples > 0
            ? `${formatMetric(data.samples, "count")} samples so far, spread over too few visits for a stable value.`
            : "No speed samples in this range. Add the speedInsights plugin from @spoar/sdk to a project to collect them."}
        </p>
      ) : null}
      {measured.length > 1 ? (
        <div className="grid gap-1">
          <h3 className="card-title">By project</h3>
          <ul className="vitals-projects">
            {measured.map(({ project, data: projectData }) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${encodeURIComponent(project.id)}/speed${viewQuery(state.view)}`}
                  className="vitals-project"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{project.name}</span>
                  {shownVitals.map((view) => {
                    const summary = vitalSummary(projectData, view.slug);
                    return (
                      <span key={view.slug} className="vitals-project-value">
                        <span className="text-muted">{view.short}</span>{" "}
                        {summary.value === null ? "–" : formatMetric(summary.value, view.format)}
                      </span>
                    );
                  })}
                  <span className="vitals-project-samples">
                    {formatMetric(projectData.samples, "count")} samples
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
