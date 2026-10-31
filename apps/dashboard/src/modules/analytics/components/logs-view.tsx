"use client";

import { Link } from "@/shared/ui/link";
import { notFound } from "next/navigation";

import { ProjectDomain } from "@/modules/shell/components/project-domain";
import { browserClient } from "@/shared/api/browser-client";

import { logPath, logTraffic, trafficOptions } from "../logs";
import { viewScope } from "../scope";
import { useProjectView } from "../use-view";
import { viewQuery } from "../view-state";
import { AddFilter } from "./add-filter";
import { EventLog } from "./event-log";
import { FieldSidebar } from "./field-sidebar";
import { FilterChips } from "./filter-chips";
import { OutcomeSection } from "./outcome-section";
import { PeriodSelect } from "./period-select";

export function LogsView() {
  const view = useProjectView();
  const { project, params, cursor, base } = view;
  const state = { ...view.state, bots: false };
  const segments = params.traffic;
  const traffic = logTraffic(segments?.[0]);
  if (segments && (segments.length > 1 || traffic === "all")) notFound();
  const path = logPath(base, traffic);
  const scope = viewScope(browserClient(), project, state);
  const scoped = scope.traffic(traffic);

  return (
    <div className="grid gap-4">
      <header className="log-toolbar">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-3xl tracking-tight">Logs</h1>
          <ProjectDomain project={project} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <AddFilter path={path} state={state} />
            <nav aria-label="Traffic" className="segmented">
              {trafficOptions.map((option) => (
                <Link
                  key={option.value}
                  href={`${logPath(base, option.value)}${viewQuery(state)}`}
                  aria-current={option.value === traffic ? "page" : undefined}
                  className="segment"
                >
                  {option.label}
                </Link>
              ))}
            </nav>
          </div>
          <PeriodSelect path={path} state={state} />
        </div>
        <FilterChips path={path} state={state} traffic={false} />
      </header>

      <div className="log-layout">
        <FieldSidebar scope={scoped} state={state} path={path} />
        <div className="grid min-w-0 content-start gap-4">
          <div className="panel">
            <OutcomeSection scope={scope} />
          </div>
          <div className="panel">
            <EventLog scope={scoped} state={state} path={path} base={base} cursor={cursor} />
          </div>
        </div>
      </div>
    </div>
  );
}
