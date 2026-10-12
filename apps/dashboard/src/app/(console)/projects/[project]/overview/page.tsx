import type { Metadata } from "next";
import { Suspense } from "react";

import { AddFilter } from "@/modules/analytics/components/add-filter";
import { FilterChips } from "@/modules/analytics/components/filter-chips";
import {
  CountrySection,
  DeviceSection,
  KpiTiles,
  OutcomeBar,
  TopGrid,
  TrafficSection,
} from "@/modules/analytics/components/overview-sections";
import { PeriodSelect } from "@/modules/analytics/components/period-select";
import {
  KpiRowSkeleton,
  OverviewCardSkeleton,
  TopGridSkeleton,
} from "@/modules/analytics/components/skeletons";
import { readScope } from "@/modules/analytics/reads";
import { ProjectDomain } from "@/modules/shell/components/project-domain";
import { readViewState, viewQuery } from "@/modules/analytics/view-state";
import type { SearchParams } from "@/modules/analytics/view-state";

type Props = { params: Promise<{ project: string }>; searchParams: Promise<SearchParams> };

export const metadata: Metadata = { title: "Traffic overview" };

export default async function Page({ params, searchParams }: Props) {
  const { project } = await params;
  const state = readViewState(await searchParams);
  const base = `/projects/${encodeURIComponent(project)}`;
  const path = `${base}/overview`;

  const scope = await readScope(project, state);

  const stats = scope.stats().then((read) => (read.ok ? read.value.data : null));
  const shared = { scope, state, path };
  const key = viewQuery(state);

  return (
    <div className="mx-auto grid max-w-[1400px] gap-4">
      <header className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-serif text-3xl tracking-tight">Traffic overview</h1>
          <Suspense fallback={null}>
            <ProjectDomain project={project} />
          </Suspense>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AddFilter path={path} state={state} />
          <PeriodSelect path={path} state={state} />
        </div>
        <FilterChips path={path} state={state} />
      </header>

      <Suspense key={`tiles${key}`} fallback={<KpiRowSkeleton />}>
        <KpiTiles scope={scope} state={state} base={base} stats={stats} />
      </Suspense>

      <div className="card">
        <Suspense key={`traffic${key}`} fallback={<OverviewCardSkeleton part="traffic" />}>
          <TrafficSection scope={scope} />
        </Suspense>
      </div>

      <div className="overview-split">
        <div className="card">
          <Suspense key={`device${key}`} fallback={<OverviewCardSkeleton part="device" />}>
            <DeviceSection {...shared} />
          </Suspense>
        </div>
        <div className="card">
          <Suspense key={`country${key}`} fallback={<OverviewCardSkeleton part="country" />}>
            <CountrySection {...shared} base={base} />
          </Suspense>
        </div>
      </div>

      <div className="card">
        <Suspense key={`outcomes${key}`} fallback={<OverviewCardSkeleton part="outcomes" />}>
          <OutcomeBar scope={scope} />
        </Suspense>
      </div>

      <Suspense key={`top${key}`} fallback={<TopGridSkeleton />}>
        <TopGrid {...shared} />
      </Suspense>
    </div>
  );
}
