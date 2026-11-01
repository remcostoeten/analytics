"use client";

import { GhostTile } from "@/modules/shell/components/ghost";
import { Link } from "@/shared/ui/link";

import { useSession } from "@/modules/session/use-session";
import { ProjectHeading } from "@/modules/shell/components/project-heading";
import { browserClient } from "@/shared/api/browser-client";
import { siteUrl } from "@/shared/config/site";
import { ExternalIcon } from "@/shared/ui/icons";

import { metricPath, metricView } from "../metrics";
import { speedViewScope } from "../scope";
import { useProject } from "../use-projects";
import { useProjectView } from "../use-view";
import { viewQuery } from "../view-state";
import type { ViewState } from "../view-state";
import { AddFilter } from "./add-filter";
import { CountrySection, SourcesSection } from "./breakdown-sections";
import { FilterChips } from "./filter-chips";
import { MetricRail } from "./metric-rail";
import { PeriodSelect } from "./period-select";
import { useSpeedSummary } from "./speed-sections";
import { SummarySection } from "./summary-section";
import { VitalsCard } from "./vitals-card";

type Props = { project: string; state: ViewState; base: string };

function Vitals({ project, state, base }: Props) {
  const scope = speedViewScope(browserClient(), project, state);
  const summary = useSpeedSummary(scope, state);
  if (summary.data === undefined) return <GhostTile height={121} wide />;
  return (
    <VitalsCard
      data={summary.data.ok ? summary.data.value.data : null}
      href={`${base}/speed${viewQuery(state)}`}
    />
  );
}

function QuickActions({ project }: Pick<Props, "project">) {
  const found = useProject(project);
  const session = useSession();
  if (found.status !== "ok") return null;
  return (
    <div className="hidden gap-2 lg:grid">
      <h2 className="text-sm font-semibold">Quick actions</h2>
      <a href={`https://${found.project.domain}`} className="quick-link">
        Open {found.project.domain}
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

export function AnalyticsView() {
  const { project, params, state, base, scope } = useProjectView();
  const view = metricView(params.metric?.[0]);
  const path = metricPath(base, view);
  const shared = { scope, view, state, path };

  return (
    <div className="mx-auto grid max-w-[1200px] items-start gap-6 lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="view-aside">
        <Vitals project={project} state={state} base={base} />
        <MetricRail scope={scope} state={state} base={base} current={view} />
        <QuickActions project={project} />
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

        <SummarySection {...shared} project={project} />
        <CountrySection {...shared} />
        <SourcesSection {...shared} />
      </div>
    </div>
  );
}
