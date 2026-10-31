"use client";

import type { AllScope, ProjectScope } from "@spoar/client";
import type { Period, PublicProject } from "@spoar/contract";
import { keepPreviousData, useQueries } from "@tanstack/react-query";
import Link from "next/link";

import { ChangeBadge } from "@/modules/analytics/components/change-badge";
import { HeatMap } from "@/modules/analytics/components/heat-map";
import { RatingBadge } from "@/modules/analytics/components/rating-badge";
import { SeriesChart } from "@/modules/analytics/components/series-chart";
import { ShareBar } from "@/modules/analytics/components/share-bar";
import { formatMetric } from "@/modules/analytics/format";
import { sumPoints } from "@/modules/analytics/logs";
import { readTopList } from "@/modules/analytics/series";
import { vitalSummary, vitalViews } from "@/modules/analytics/speed";
import { periods } from "@/modules/analytics/view-state";
import type { FilterDimension } from "@/modules/analytics/view-state";
import { useRead } from "@/shared/query/read";
import { ChartIllustration, EmptyState } from "@/shared/ui/empty-state";

import { rankProjects } from "../projects";
import { OnlineCount } from "./online-count";
import { RankList } from "./rank-list";

type ScopeProps = { scope: AllScope };

type PeriodProps = ScopeProps & { period: Period };

type VitalsProps = PeriodProps & {
  projects: PublicProject[];
  projectScope: (id: string) => ProjectScope;
};

type VisitorsProps = PeriodProps & { projectCount: number };

type ProjectsProps = PeriodProps & { projects: PublicProject[] };

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

const minSamples = 20;

const speedOptions = { percentile: 75 } as const;

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

export function VisitorsCard({ scope, period, projectCount }: VisitorsProps) {
  const stats = useRead(scope.key("stats"), () => scope.stats());
  const series = useRead(scope.key("timeseries", "visitors"), () => scope.timeseries("visitors"));
  if (stats.data === undefined || series.data === undefined) return <CardSkeleton height={392} />;
  const visitors = stats.data.ok ? stats.data.value.data.visitors : null;
  const read = series.data;
  const projects = `${projectCount} ${projectCount === 1 ? "project" : "projects"}`;
  return (
    <section className="card card-section">
      <header className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <span className="home-figure">
            {visitors ? formatMetric(visitors.value, "count") : "–"}
          </span>
          <p className="text-xs text-muted">
            Unique visitors in the {periodPhrase(period)} across {projects}.
          </p>
        </div>
        <ChangeBadge change={visitors?.change ?? null} lowerIsBetter={false} />
      </header>
      {!read.ok ? (
        <p className="text-sm text-err">Could not read the series: {read.error.message}</p>
      ) : sumPoints(read.value.data) === 0 ? (
        <EmptyState
          title="No visitors in this range"
          description="Visitors from every project show up here."
          illustration={<ChartIllustration />}
        />
      ) : (
        <SeriesChart
          series={[{ label: "Visitors", points: read.value.data }]}
          format="count"
          interval={read.value.interval}
          label="Visitors"
        />
      )}
    </section>
  );
}

export function OnlineCard({ scope }: ScopeProps) {
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
          <RankList dimension="device" rows={read.value.data} share />
        ) : (
          <p className="text-sm text-err">{read.error}</p>
        )}
      </div>
    </section>
  );
}

export function ProjectsCard({ scope, period, projects }: ProjectsProps) {
  const options = { metrics: ["visitors", "pageviews"], limit: 100 } as const;
  const traffic = useRead(scope.key("projectBreakdown", options), () =>
    scope.projectBreakdown(options),
  );
  if (traffic.data === undefined) return <CardSkeleton height={340} />;
  const read = traffic.data;
  const rows = rankProjects(projects, read.ok ? read.value.data : []);
  return (
    <section className="card card-section">
      <CardHead
        title="Projects"
        description={`Ranked by visitors in the ${periodPhrase(period)}.`}
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
                Change
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link
                    href={`/projects/${encodeURIComponent(row.id)}`}
                    className="font-medium hover:underline"
                  >
                    {row.name}
                  </Link>
                  <span className="block text-xs text-muted">{row.domain}</span>
                </td>
                <td className="num">{formatMetric(row.visitors, "count")}</td>
                <td className="num">
                  {row.change === null ? (
                    <span className="text-muted">–</span>
                  ) : (
                    <span className="flex justify-end">
                      <ChangeBadge change={row.change} lowerIsBetter={false} />
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function RankCard({ scope, title, description, dimension, limit }: RankCardProps) {
  const list = useAllTopList(scope, dimension, "visitors", Math.max(limit, expandedRows));
  if (list.data === undefined) return <CardSkeleton height={limit > 6 ? 340 : 252} />;
  const read = list.data;
  return (
    <section className="card card-section">
      <CardHead title={title} description={description} />
      {read.ok ? (
        <RankList dimension={dimension} rows={read.value.data} collapsed={limit} />
      ) : (
        <p className="text-sm text-err">{read.error}</p>
      )}
    </section>
  );
}

export function HeatMapCard({ scope, period }: PeriodProps) {
  const countries = useAllTopList(scope, "country", "visitors", mapRows);
  if (countries.data === undefined) return <CardSkeleton height={460} />;
  const read = countries.data;
  return (
    <section className="card card-section">
      <CardHead
        title="Visitor map"
        description={`Where visitors came from in the ${periodPhrase(period)}.`}
      />
      {read.ok ? (
        <HeatMap rows={read.value.data} count="visitors" />
      ) : (
        <p className="text-sm text-err">{read.error}</p>
      )}
    </section>
  );
}

export function VitalsCard({ scope, period, projects, projectScope }: VitalsProps) {
  const listed = projects.slice(0, vitalProjects);
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
  const count = `${projects.length} ${projects.length === 1 ? "project" : "projects"}`;
  return (
    <section className="card card-section">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <CardHead
          title="Core Web Vitals"
          description={`Real visits to ${count} combined, ${periodPhrase(period)}, 75th percentile on all devices. A value needs ${minSamples} samples.`}
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
                  href={`/projects/${encodeURIComponent(project.id)}/speed`}
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
