import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AddFilter } from "@/modules/analytics/components/add-filter";
import { CountrySection, SourcesSection } from "@/modules/analytics/components/breakdown-sections";
import { FilterChips } from "@/modules/analytics/components/filter-chips";
import { MetricRail } from "@/modules/analytics/components/metric-rail";
import type { RailData } from "@/modules/analytics/components/metric-rail";
import { PeriodSelect } from "@/modules/analytics/components/period-select";
import { SummarySection } from "@/modules/analytics/components/summary-section";
import { metricView, metricViews } from "@/modules/analytics/metrics";
import type { MetricView } from "@/modules/analytics/metrics";
import { listProjects, readScope } from "@/modules/analytics/reads";
import { readViewState, viewQuery } from "@/modules/analytics/view-state";
import type { SearchParams, ViewState } from "@/modules/analytics/view-state";
import { readSession } from "@/modules/session/session";
import { ProjectHeader } from "@/modules/shell/components/project-header";
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

type SummaryProps = Omit<RailProps, "base"> & {
  path: string;
  canAnnotate: boolean;
};

async function Summary({ stats, scope, view, state, path, project, canAnnotate }: SummaryProps) {
  const data = await stats;
  const total = data ? data[view.stat].value : null;
  return (
    <SummarySection
      scope={scope}
      view={view}
      state={state}
      path={path}
      total={total}
      project={project}
      canAnnotate={canAnnotate}
    />
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

export default async function Page({ params, searchParams }: Props) {
  const { project, metric } = await params;
  const view = metricView(metric?.[0]);
  const state = readViewState(await searchParams);
  const base = `/projects/${encodeURIComponent(project)}`;
  const path = `${base}/${view.slug}`;

  const [projects, session, scope] = await Promise.all([
    listProjects(),
    readSession(),
    readScope(project, state),
  ]);
  const found = projects.ok ? projects.value.find((entry) => entry.id === project) : undefined;
  if (!found) notFound();

  const stats = scope.stats().then((read) => (read.ok ? read.value.data : null));
  const shared = { scope, view, state };

  return (
    <div className="mx-auto grid max-w-[1200px] items-start gap-6 lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="grid gap-6">
        <Suspense key={`${view.slug}${viewQuery(state)}`} fallback={<RailSkeleton />}>
          <Rail {...shared} stats={stats} base={base} project={project} />
        </Suspense>
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
      </aside>

      <div className="panel">
        <ProjectHeader
          title={`Web analytics for ${found.name}`}
          domain={found.domain}
          live={{ project, href: `${base}/realtime` }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <AddFilter path={path} state={state} />
            <PeriodSelect path={path} state={state} />
          </div>
          <FilterChips path={path} state={state} />
        </ProjectHeader>

        <Suspense
          key={`summary${path}${viewQuery(state)}`}
          fallback={<SectionSkeleton height={380} />}
        >
          <Summary
            {...shared}
            stats={stats}
            path={path}
            project={project}
            canAnnotate={session.isAdmin}
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
