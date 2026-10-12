import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AddFilter } from "@/modules/analytics/components/add-filter";
import { CountrySection, SourcesSection } from "@/modules/analytics/components/breakdown-sections";
import { FilterChips } from "@/modules/analytics/components/filter-chips";
import { MetricRail } from "@/modules/analytics/components/metric-rail";
import type { RailData } from "@/modules/analytics/components/metric-rail";
import { PeriodSelect } from "@/modules/analytics/components/period-select";
import { SummarySection } from "@/modules/analytics/components/summary-section";
import { VitalsCard } from "@/modules/analytics/components/vitals-card";
import { metricPath, metricView, metricViews } from "@/modules/analytics/metrics";
import type { MetricView } from "@/modules/analytics/metrics";
import { findProject, readScope, speedScope } from "@/modules/analytics/reads";
import { speedDevice } from "@/modules/analytics/speed";
import { readViewState, viewQuery } from "@/modules/analytics/view-state";
import type { SearchParams, ViewState } from "@/modules/analytics/view-state";
import { readSession } from "@/modules/session/session";
import { ProjectHeading } from "@/modules/shell/components/project-heading";
import { SectionSkeleton } from "@/modules/shell/components/skeletons";
import { siteUrl } from "@/shared/config/site";
import { ExternalIcon } from "@/shared/ui/icons";
import type { ProjectScope } from "@spoar/client";
import type { StatsResponse } from "@spoar/contract";

type Props = {
  params: Promise<{ project: string; metric?: string[] }>;
  searchParams: Promise<SearchParams>;
};

export const metadata: Metadata = { title: "Web analytics" };

type RailProps = {
  stats: Promise<StatsResponse["data"] | null>;
  scope: ProjectScope;
  view: MetricView;
  state: ViewState;
  base: string;
  project: string;
};

async function Rail({ stats, scope, view, state, base, project }: RailProps) {
  const [data, ...series] = await Promise.all([
    stats,
    ...metricViews.map((entry) => scope.timeseries(entry.series)),
  ]);
  const sparklines: RailData["sparklines"] = {};
  metricViews.forEach((entry, index) => {
    const read = series[index];
    if (read?.ok) sparklines[entry.slug] = read.value.data;
  });
  return (
    <MetricRail
      project={project}
      state={state}
      base={base}
      current={view}
      initial={{ stats: data, sparklines }}
      renderedAt={Date.now()}
    />
  );
}

async function Vitals({ project, state, base }: Pick<RailProps, "project" | "state" | "base">) {
  const scope = await speedScope(project, state);
  const read = await scope.speed({
    percentile: state.percentile,
    device: speedDevice(state.filters),
  });
  return (
    <VitalsCard data={read.ok ? read.value.data : null} href={`${base}/speed${viewQuery(state)}`} />
  );
}

function RailSkeleton() {
  return (
    <div className="rail" aria-hidden="true">
      {metricViews.map((view) => (
        <div key={view.slug} className="skeleton h-[104px]" />
      ))}
    </div>
  );
}

async function QuickActions({ project }: Pick<RailProps, "project">) {
  const [found, session] = await Promise.all([findProject(project), readSession()]);
  if (!found) return null;
  return (
    <div className="hidden gap-2 lg:grid">
      <h2 className="text-sm font-semibold">Quick actions</h2>
      <a href={`https://${found.domain}`} className="quick-link">
        Open {found.domain}
        <ExternalIcon className="size-3" />
      </a>
      {session.isAdmin ? (
        <Link href={`/admin/projects/${encodeURIComponent(project)}`} className="quick-link">
          Project settings
        </Link>
      ) : null}
      <a href={`${siteUrl()}/docs`} className="quick-link">
        Documentation
      </a>
    </div>
  );
}

export default async function Page({ params, searchParams }: Props) {
  const { project, metric } = await params;
  const view = metricView(metric?.[0]);
  const state = readViewState(await searchParams);
  const base = `/projects/${encodeURIComponent(project)}`;
  const path = metricPath(base, view);

  const scope = await readScope(project, state);
  const stats = scope.stats().then((read) => (read.ok ? read.value.data : null));
  const shared = { scope, view, state };

  return (
    <div className="mx-auto grid max-w-[1200px] items-start gap-6 lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="grid gap-6">
        <Suspense
          key={`vitals${viewQuery(state)}`}
          fallback={<div className="skeleton h-[118px]" />}
        >
          <Vitals project={project} state={state} base={base} />
        </Suspense>
        <Suspense key={`${view.slug}${viewQuery(state)}`} fallback={<RailSkeleton />}>
          <Rail {...shared} stats={stats} base={base} project={project} />
        </Suspense>
        <Suspense fallback={null}>
          <QuickActions project={project} />
        </Suspense>
      </aside>

      <div className="panel">
        <ProjectHeading
          project={project}
          title="Web analytics for"
          live={{ project, href: `${base}/realtime` }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <AddFilter path={path} state={state} />
            <PeriodSelect path={path} state={state} />
          </div>
          <FilterChips path={path} state={state} />
        </ProjectHeading>

        <Suspense
          key={`summary${path}${viewQuery(state)}`}
          fallback={<SectionSkeleton height={380} />}
        >
          <SummarySection
            {...shared}
            path={path}
            project={project}
            headline={stats.then((data) => ({
              total: data ? data[view.stat].value : null,
              change: data ? data[view.stat].change : null,
            }))}
            canAnnotate={readSession().then((session) => session.isAdmin)}
          />
        </Suspense>
        <Suspense
          key={`country${path}${viewQuery(state)}`}
          fallback={<SectionSkeleton height={200} />}
        >
          <CountrySection {...shared} path={path} />
        </Suspense>
        <Suspense
          key={`sources${path}${viewQuery(state)}`}
          fallback={<SectionSkeleton height={420} />}
        >
          <SourcesSection {...shared} path={path} />
        </Suspense>
      </div>
    </div>
  );
}
