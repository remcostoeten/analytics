import type { AllScope } from "@spoar/client";
import type { BreakdownRow, Period, PublicProject } from "@spoar/contract";
import Link from "next/link";

import { ChangeBadge } from "@/modules/analytics/components/change-badge";
import { ChartIllustration, EmptyState } from "@/shared/ui/empty-state";
import { RatingBadge } from "@/modules/analytics/components/rating-badge";
import { SeriesChart } from "@/modules/analytics/components/series-chart";
import { ShareBar } from "@/modules/analytics/components/share-bar";
import { formatDimensionValue, formatMetric } from "@/modules/analytics/format";
import { sumPoints } from "@/modules/analytics/logs";
import { readTopList } from "@/modules/analytics/reads";
import { vitalSummary, vitalViews } from "@/modules/analytics/speed";
import { periods } from "@/modules/analytics/view-state";
import type { FilterDimension } from "@/modules/analytics/view-state";

import { rankProjects } from "../projects";
import { OnlineCount } from "./online-count";

type ScopeProps = { scope: AllScope };

type PeriodProps = ScopeProps & { period: Period };

type VisitorsProps = PeriodProps & { projectCount: number };

type ProjectsProps = PeriodProps & { projects: PublicProject[] };

type RankCardProps = ScopeProps & {
  title: string;
  description: string;
  dimension: FilterDimension;
  limit: number;
};

type RankListProps = { dimension: FilterDimension; rows: BreakdownRow[]; share?: boolean };

type CardHeadProps = { title: string; description: string };

const shownVitals = vitalViews.filter((view) => ["lcp", "inp", "cls"].includes(view.slug));

const deviceRows = 4;

function periodPhrase(period: Period) {
  const label = periods.find((entry) => entry.value === period)?.label ?? period;
  return label.toLowerCase();
}

function CardHead({ title, description }: CardHeadProps) {
  return (
    <header className="grid gap-0.5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="text-xs text-muted">{description}</p>
    </header>
  );
}

function RankList({ dimension, rows, share = false }: RankListProps) {
  if (rows.length === 0) return <p className="py-2 text-sm text-muted">No data in this range</p>;
  const max = Math.max(1, ...rows.map((row) => row.visitors ?? 0));
  const total = rows.reduce((sum, row) => sum + (row.visitors ?? 0), 0);
  return (
    <ul className="rank-list">
      {rows.map((row) => {
        const value = row.visitors ?? 0;
        const percent = total === 0 ? 0 : Math.round((value / total) * 100);
        return (
          <li key={row.value} className="rank-row">
            <span
              className="rank-fill"
              style={{ width: `${(value / max) * 100}%` }}
              aria-hidden="true"
            />
            <span className={dimension === "device" ? "rank-label capitalize" : "rank-label"}>
              {formatDimensionValue(dimension, row.value)}
            </span>
            <span className="rank-value">
              {share ? `${percent}%` : formatMetric(value, "count")}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export async function VisitorsCard({ scope, period, projectCount }: VisitorsProps) {
  const [stats, series] = await Promise.all([scope.stats(), scope.timeseries("visitors")]);
  const visitors = stats.ok ? stats.value.data.visitors : null;
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
      {!series.ok ? (
        <p className="text-sm text-err">Could not read the series: {series.error.message}</p>
      ) : sumPoints(series.value.data) === 0 ? (
        <EmptyState
          title="No visitors in this range"
          description="Visitors from every project show up here."
          illustration={<ChartIllustration />}
        />
      ) : (
        <SeriesChart
          series={[{ label: "Visitors", points: series.value.data }]}
          format="count"
          interval={series.value.interval}
          label="Visitors"
        />
      )}
    </section>
  );
}

export async function OnlineCard({ scope }: ScopeProps) {
  const [live, devices] = await Promise.all([
    scope.realtime(),
    readTopList(scope, "device", "visitors", deviceRows),
  ]);
  return (
    <section className="card card-section">
      <header className="grid gap-1">
        <OnlineCount initial={live.ok ? live.value.data.visitors : null} />
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <span className="live-dot" aria-hidden="true" />
          visitors online
        </p>
      </header>
      <div className="grid gap-2">
        <h3 className="card-title">Devices</h3>
        {devices.ok ? (
          <RankList dimension="device" rows={devices.value.data} share />
        ) : (
          <p className="text-sm text-err">{devices.error}</p>
        )}
      </div>
    </section>
  );
}

export async function ProjectsCard({ scope, period, projects }: ProjectsProps) {
  const traffic = await scope.projectBreakdown({ metrics: ["visitors", "pageviews"], limit: 100 });
  const rows = rankProjects(projects, traffic.ok ? traffic.value.data : []);
  return (
    <section className="card card-section">
      <CardHead
        title="Projects"
        description={`Ranked by visitors in the ${periodPhrase(period)}.`}
      />
      {traffic.ok ? null : (
        <p className="text-sm text-err">Could not read traffic: {traffic.error.message}</p>
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

export async function RankCard({ scope, title, description, dimension, limit }: RankCardProps) {
  const read = await readTopList(scope, dimension, "visitors", limit);
  return (
    <section className="card card-section">
      <CardHead title={title} description={description} />
      {read.ok ? (
        <RankList dimension={dimension} rows={read.value.data} />
      ) : (
        <p className="text-sm text-err">{read.error}</p>
      )}
    </section>
  );
}

export async function VitalsCard({ scope, period }: PeriodProps) {
  const read = await scope.speed({ percentile: 75 });
  return (
    <section className="card card-section">
      <CardHead
        title="Core Web Vitals"
        description={`Field data from real sessions in the ${periodPhrase(period)}, 75th percentile, all devices.`}
      />
      {read.ok ? null : (
        <p className="text-sm text-err">Could not read speed: {read.error.message}</p>
      )}
      <dl className="home-vitals">
        {shownVitals.map((view) => {
          const summary = read.ok ? vitalSummary(read.value.data, view.slug) : null;
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
                  {summary ? `${formatMetric(summary.samples, "count")} samples` : null}
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
