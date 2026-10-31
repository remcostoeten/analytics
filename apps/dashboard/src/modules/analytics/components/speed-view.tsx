"use client";

import { ProjectHeading } from "@/modules/shell/components/project-heading";
import { browserClient } from "@/shared/api/browser-client";

import { speedViewScope } from "../scope";
import { speedFilterDimensions, unsupportedSpeedFilters, vitalView } from "../speed";
import { useProjectView } from "../use-view";
import { viewQuery } from "../view-state";
import { AddFilter } from "./add-filter";
import { FilterChips } from "./filter-chips";
import { PeriodSelect } from "./period-select";
import { DeviceTabs, PercentileSelect } from "./speed-controls";
import { SpeedElements, SpeedRoutes, SpeedSummary, useSpeedSummary } from "./speed-sections";
import { VitalsRail } from "./vitals-rail";

const vitalHeights = [101, 91, 91, 91, 91, 91];

function RailSkeleton() {
  return (
    <div className="rail" aria-hidden="true">
      {vitalHeights.map((height, index) => (
        <div key={index} className="skeleton" style={{ height }} />
      ))}
    </div>
  );
}

export function SpeedView() {
  const { project, params, state, base } = useProjectView();
  const view = vitalView(params.metric?.[0]);
  const path = `${base}/speed/${view.slug}`;
  const scope = speedViewScope(browserClient(), project, state);
  const summary = useSpeedSummary(scope, state);
  const shared = { scope, view, state, path };
  return (
    <div className="mx-auto grid max-w-[1200px] items-start gap-6 lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="grid gap-6">
        {summary.data === undefined ? (
          <RailSkeleton />
        ) : (
          <VitalsRail
            data={summary.data.ok ? summary.data.value.data : null}
            current={view}
            hrefFor={(entry) => `${base}/speed/${entry.slug}${viewQuery(state)}`}
          />
        )}
      </aside>

      <div className="panel">
        <ProjectHeading project={project} title="Speed for">
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
        </ProjectHeading>

        <SpeedSummary {...shared} project={project} />
        <SpeedRoutes {...shared} />
        <SpeedElements {...shared} />
      </div>
    </div>
  );
}
