"use client";

import { ProjectDomain } from "@/modules/shell/components/project-domain";

import { useProjectView } from "../use-view";
import { AddFilter } from "./add-filter";
import { FilterChips } from "./filter-chips";
import {
  CountrySection,
  DeviceSection,
  KpiTiles,
  OutcomeBar,
  TopGrid,
  TrafficSection,
} from "./overview-sections";
import { PeriodSelect } from "./period-select";

export function OverviewView() {
  const { project, state, base, scope } = useProjectView();
  const path = `${base}/overview`;
  const shared = { scope, state, path };

  return (
    <div className="mx-auto grid max-w-[1400px] gap-4">
      <header className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-serif text-3xl tracking-tight">Traffic overview</h1>
          <ProjectDomain project={project} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AddFilter path={path} state={state} />
          <PeriodSelect path={path} state={state} />
        </div>
        <FilterChips path={path} state={state} />
      </header>

      <KpiTiles scope={scope} state={state} base={base} />

      <div className="card">
        <TrafficSection scope={scope} />
      </div>

      <div className="overview-split">
        <div className="card">
          <DeviceSection {...shared} />
        </div>
        <div className="card">
          <CountrySection {...shared} base={base} />
        </div>
      </div>

      <div className="card">
        <OutcomeBar scope={scope} />
      </div>

      <TopGrid {...shared} />
    </div>
  );
}
