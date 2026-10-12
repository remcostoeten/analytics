import type { Metadata } from "next";
import { Suspense } from "react";

import { AddFilter } from "@/modules/analytics/components/add-filter";
import { FilterChips } from "@/modules/analytics/components/filter-chips";
import { PeriodSelect } from "@/modules/analytics/components/period-select";
import { VisitorList } from "@/modules/analytics/components/visitor-list";
import { readScope } from "@/modules/analytics/reads";
import { readViewState, viewQuery } from "@/modules/analytics/view-state";
import type { SearchParams } from "@/modules/analytics/view-state";
import { ProjectHeading } from "@/modules/shell/components/project-heading";
import { SectionSkeleton } from "@/modules/shell/components/skeletons";

type Props = { params: Promise<{ project: string }>; searchParams: Promise<SearchParams> };

export const metadata: Metadata = { title: "Visitors" };

export default async function Page({ params, searchParams }: Props) {
  const { project } = await params;
  const query = await searchParams;
  const state = readViewState(query);
  const cursor = Array.isArray(query.cursor) ? query.cursor[0] : query.cursor;
  const path = `/projects/${encodeURIComponent(project)}/visitors`;

  const scope = await readScope(project, state);

  return (
    <div className="mx-auto grid max-w-[1200px] gap-6">
      <div className="panel">
        <ProjectHeading project={project} title="Visitors of">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <AddFilter path={path} state={state} />
            <PeriodSelect path={path} state={state} />
          </div>
          <FilterChips path={path} state={state} />
        </ProjectHeading>
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
