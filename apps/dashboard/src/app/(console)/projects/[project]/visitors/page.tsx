import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AddFilter } from "@/modules/analytics/components/add-filter";
import { FilterChips } from "@/modules/analytics/components/filter-chips";
import { PeriodSelect } from "@/modules/analytics/components/period-select";
import { VisitorList } from "@/modules/analytics/components/visitor-list";
import { listProjects, readScope } from "@/modules/analytics/reads";
import { readViewState, viewQuery } from "@/modules/analytics/view-state";
import type { SearchParams } from "@/modules/analytics/view-state";
import { ProjectHeader } from "@/modules/shell/components/project-header";
import { SectionSkeleton } from "@/modules/shell/components/skeletons";

type Props = { params: Promise<{ project: string }>; searchParams: Promise<SearchParams> };

export const metadata: Metadata = { title: "Visitors" };

export default async function Page({ params, searchParams }: Props) {
  const { project } = await params;
  const query = await searchParams;
  const state = readViewState(query);
  const cursor = Array.isArray(query.cursor) ? query.cursor[0] : query.cursor;
  const path = `/projects/${encodeURIComponent(project)}/visitors`;

  const [projects, scope] = await Promise.all([listProjects(), readScope(project, state)]);
  const found = projects.ok ? projects.value.find((entry) => entry.id === project) : undefined;
  if (!found) notFound();

  return (
    <div className="mx-auto grid max-w-[1200px] gap-6">
      <div className="panel">
        <ProjectHeader title={`Visitors of ${found.name}`} domain={found.domain}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <AddFilter path={path} state={state} />
            <PeriodSelect path={path} state={state} />
          </div>
          <FilterChips path={path} state={state} />
        </ProjectHeader>
        <Suspense
          key={`${viewQuery(state)}${cursor ?? ""}`}
          fallback={<SectionSkeleton height={360} />}
        >
          <VisitorList scope={scope} state={state} path={path} cursor={cursor} />
        </Suspense>
      </div>
    </div>
  );
}
