import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AddFilter } from "@/modules/analytics/components/add-filter";
import { FilterChips } from "@/modules/analytics/components/filter-chips";
import { PeriodSelect } from "@/modules/analytics/components/period-select";
import { DeviceTabs, PercentileSelect } from "@/modules/analytics/components/speed-controls";
import {
  SpeedElements,
  SpeedRoutes,
  SpeedSummary,
} from "@/modules/analytics/components/speed-sections";
import { VitalsRail } from "@/modules/analytics/components/vitals-rail";
import { listProjects, speedScope } from "@/modules/analytics/reads";
import {
  speedDevice,
  speedFilterDimensions,
  unsupportedSpeedFilters,
  vitalView,
} from "@/modules/analytics/speed";
import type { VitalView } from "@/modules/analytics/speed";
import { readViewState, viewQuery } from "@/modules/analytics/view-state";
import type { SearchParams, ViewState } from "@/modules/analytics/view-state";
import { ProjectHeader } from "@/modules/shell/components/project-header";
import { SectionSkeleton } from "@/modules/shell/components/skeletons";
import type { ProjectScope } from "@spoar/client";
import type { SpeedResponse } from "@spoar/contract";

type Props = {
  params: Promise<{ project: string; metric?: string[] }>;
  searchParams: Promise<SearchParams>;
};

export const metadata: Metadata = { title: "Speed" };

type RailProps = {
  summary: Promise<SpeedResponse["data"] | null>;
  view: VitalView;
  state: ViewState;
  base: string;
};

async function Rail({ summary, view, state, base }: RailProps) {
  const data = await summary;
  return (
    <VitalsRail
      data={data}
      current={view}
      hrefFor={(entry) => `${base}/speed/${entry.slug}${viewQuery(state)}`}
    />
  );
}

function RailSkeleton() {
  return (
    <div className="grid gap-2" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="skeleton h-[104px]" />
      ))}
    </div>
  );
}

export default async function Page({ params, searchParams }: Props) {
  const { project, metric } = await params;
  const view = vitalView(metric?.[0]);
  const state = readViewState(await searchParams);
  const base = `/projects/${encodeURIComponent(project)}`;
  const path = `${base}/speed/${view.slug}`;

  const [projects, scope] = await Promise.all([listProjects(), speedScope(project, state)]);
  const found = projects.ok ? projects.value.find((entry) => entry.id === project) : undefined;
  if (!found) notFound();

  const summary: Promise<SpeedResponse["data"] | null> = scope
    .speed({ percentile: state.percentile, device: speedDevice(state.filters) })
    .then((read) => (read.ok ? read.value.data : null));
  const shared: { scope: ProjectScope; view: VitalView; state: ViewState; path: string } = {
    scope,
    view,
    state,
    path,
  };
  const key = `${path}${viewQuery(state)}`;

  return (
    <div className="mx-auto grid max-w-[1200px] items-start gap-6 lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="grid gap-6">
        <Suspense key={key} fallback={<RailSkeleton />}>
          <Rail summary={summary} view={view} state={state} base={base} />
        </Suspense>
      </aside>

      <div className="panel">
        <ProjectHeader title={`Speed for ${found.name}`} domain={found.domain}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <AddFilter path={path} state={state} dimensions={speedFilterDimensions} />
            <div className="flex flex-wrap items-center gap-2">
              <PercentileSelect path={path} state={state} />
              <PeriodSelect path={path} state={state} />
            </div>
          </div>
          <FilterChips
            path={path}
            state={state}
            inactive={unsupportedSpeedFilters(state)}
            traffic={false}
          />
          <DeviceTabs path={path} state={state} />
        </ProjectHeader>

        <Suspense key={`summary${key}`} fallback={<SectionSkeleton height={380} />}>
          <SpeedSummary {...shared} summary={summary} />
        </Suspense>
        <Suspense key={`routes${key}`} fallback={<SectionSkeleton height={320} />}>
          <SpeedRoutes {...shared} />
        </Suspense>
        <Suspense key={`elements${key}`} fallback={<SectionSkeleton height={240} />}>
          <SpeedElements {...shared} />
        </Suspense>
      </div>
    </div>
  );
}
