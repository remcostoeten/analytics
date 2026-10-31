"use client";

import { ProjectHeading } from "@/modules/shell/components/project-heading";

import { useProjectView } from "../use-view";
import { AddFilter } from "./add-filter";
import { FilterChips } from "./filter-chips";
import { PeriodSelect } from "./period-select";
import { VisitorList } from "./visitor-list";
import { VisitorSummary } from "./visitor-summary";

export function VisitorsView() {
  const { project, state, cursor, base, scope } = useProjectView();
  const path = `${base}/visitors`;

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
        <VisitorSummary scope={scope} state={state} path={path} />
        <VisitorList scope={scope} state={state} path={path} cursor={cursor} />
      </div>
    </div>
  );
}
