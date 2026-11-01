"use client";

import { useRouter } from "next/navigation";

import { Chip, FilterChips } from "@/modules/analytics/components/filter-chips";
import { PeriodSelect } from "@/modules/analytics/components/period-select";
import { speedViewScope } from "@/modules/analytics/scope";
import { useProjects } from "@/modules/analytics/use-projects";
import { hasFilters } from "@/modules/analytics/view-state";
import { useSession } from "@/modules/session/use-session";
import { GhostCard } from "@/modules/shell/components/ghost";
import { browserClient } from "@/shared/api/browser-client";
import { siteUrl } from "@/shared/config/site";
import { EmptyState, ProjectIllustration } from "@/shared/ui/empty-state";
import { Link } from "@/shared/ui/link";
import { Select } from "@/shared/ui/select";

import { homeHref, homeScope, homeSpeedScope, useHomeState } from "../home-state";

import {
  HeatMapCard,
  OnlineCard,
  ProjectsCard,
  RankCard,
  TrafficCard,
  VitalsCard,
} from "./home-sections";

const sources = [
  { dimension: "channel", title: "Channels", description: "Visitors by acquisition channel." },
  { dimension: "referrer_domain", title: "Referrers", description: "Sites sending visitors." },
  { dimension: "browser", title: "Browsers", description: "Visitors by browser." },
  { dimension: "os", title: "Operating systems", description: "Visitors by operating system." },
] as const;

const listRows = 6;

const allProjects = "all";

function BodySkeleton() {
  return (
    <>
      <div className="home-top">
        <GhostCard kind="metrics" height={392} />
        <GhostCard kind="list" height={392} rows={4} />
      </div>
      <div className="home-pair">
        <GhostCard kind="list" height={340} rows={6} />
        <GhostCard kind="list" height={340} rows={6} />
      </div>
      <GhostCard kind="map" height={460} />
      <div className="home-quad">
        {sources.map((source) => (
          <GhostCard key={source.dimension} kind="list" height={252} rows={5} />
        ))}
      </div>
      <GhostCard kind="list" height={260} rows={5} />
    </>
  );
}

export function HomeView() {
  const state = useHomeState();
  const router = useRouter();
  const projects = useProjects();
  const session = useSession();
  const api = browserClient();
  const scope = homeScope(api, state);
  const speedScope = homeSpeedScope(api, state);
  const listed = projects.status === "ok" ? projects.projects : [];
  const focused = listed.find((project) => project.id === state.project);
  const projectOptions = [
    { value: allProjects, label: "All projects" },
    ...listed.map((project) => ({ value: project.id, label: project.name })),
  ];

  return (
    <div className="mx-auto grid max-w-[1200px] gap-4">
      <header className="flex flex-wrap items-start justify-between gap-4 pb-2">
        <div className="grid gap-1">
          <h1 className="font-serif text-3xl tracking-tight">Overview</h1>
          <p className="text-sm text-muted">Traffic across every project you can read.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {listed.length > 1 ? (
            <div className="control-box">
              <Select
                variant="bare"
                label="Project"
                value={state.project ?? allProjects}
                options={projectOptions}
                onChange={(value) =>
                  router.push(
                    homeHref({
                      ...state,
                      project: value === allProjects ? null : value,
                      byProject: false,
                    }),
                    { scroll: false },
                  )
                }
              />
            </div>
          ) : null}
          <PeriodSelect path="" state={state.view} query={(view) => homeHref({ ...state, view })} />
          <a href={`${siteUrl()}/docs`} className="ghost-button">
            Documentation
          </a>
          {session.isAdmin ? (
            <Link href="/admin/projects/new" className="solid-button">
              Add a project
            </Link>
          ) : null}
        </div>
      </header>

      {hasFilters(state.view) || focused ? (
        <div className="flex flex-wrap items-center gap-2">
          {focused ? (
            <Chip
              field="Project"
              operator="equals"
              value={focused.name}
              href={homeHref({ ...state, project: null })}
            />
          ) : null}
          <FilterChips
            path=""
            state={state.view}
            traffic={false}
            query={(view) => homeHref({ ...state, view })}
          />
        </div>
      ) : null}

      {projects.status === "loading" ? (
        <BodySkeleton />
      ) : projects.status === "error" ? (
        <p className="text-sm text-err">Could not list projects: {projects.message}</p>
      ) : projects.projects.length === 0 ? (
        <EmptyState
          className="[--es-surface:var(--bg)]"
          size="lg"
          title={session.user ? "No projects yet" : "No public projects"}
          description={
            session.user
              ? "Add a project to start collecting visitors, page views and events."
              : "Sign in to see the projects you can access."
          }
          illustration={<ProjectIllustration />}
        >
          {session.isAdmin ? (
            <Link href="/admin/projects/new" className="solid-button">
              Add a project
            </Link>
          ) : null}
          {session.user ? null : (
            <Link href="/sign-in" className="solid-button">
              Sign in
            </Link>
          )}
        </EmptyState>
      ) : (
        <>
          <div className="home-top">
            <TrafficCard scope={scope} state={state} projects={projects.projects} />
            <OnlineCard scope={scope} state={state} />
          </div>

          <div className="home-pair">
            <ProjectsCard scope={scope} state={state} projects={projects.projects} />
            <RankCard
              scope={scope}
              state={state}
              dimension="country"
              title="Top countries"
              description="Visitors by country."
              limit={8}
            />
          </div>

          <HeatMapCard scope={scope} state={state} />

          <div className="home-quad">
            {sources.map((source) => (
              <RankCard
                key={source.dimension}
                scope={scope}
                state={state}
                limit={listRows}
                {...source}
              />
            ))}
          </div>

          <VitalsCard
            scope={speedScope}
            state={state}
            projects={projects.projects}
            projectScope={(id) => speedViewScope(api, id, state.view)}
          />
        </>
      )}
    </div>
  );
}
