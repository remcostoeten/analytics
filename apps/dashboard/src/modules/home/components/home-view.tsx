"use client";

import { Link } from "@/shared/ui/link";

import { PeriodSelect } from "@/modules/analytics/components/period-select";
import { useProjects } from "@/modules/analytics/use-projects";
import { useViewState } from "@/modules/analytics/use-view";
import { useSession } from "@/modules/session/use-session";
import { browserClient } from "@/shared/api/browser-client";
import { siteUrl } from "@/shared/config/site";
import { EmptyState, ProjectIllustration } from "@/shared/ui/empty-state";

import {
  HeatMapCard,
  OnlineCard,
  ProjectsCard,
  RankCard,
  VisitorsCard,
  VitalsCard,
} from "./home-sections";

const sources = [
  { dimension: "channel", title: "Channels", description: "Visitors by acquisition channel." },
  { dimension: "referrer_domain", title: "Referrers", description: "Sites sending visitors." },
  { dimension: "browser", title: "Browsers", description: "Visitors by browser." },
  { dimension: "os", title: "Operating systems", description: "Visitors by operating system." },
] as const;

const listRows = 6;

function CardSkeleton({ height }: { height: number }) {
  return <div className="skeleton" style={{ height }} aria-hidden="true" />;
}

function BodySkeleton() {
  return (
    <>
      <div className="home-top">
        <CardSkeleton height={392} />
        <CardSkeleton height={392} />
      </div>
      <div className="home-pair">
        <CardSkeleton height={340} />
        <CardSkeleton height={340} />
      </div>
      <CardSkeleton height={460} />
      <div className="home-quad">
        {sources.map((source) => (
          <CardSkeleton key={source.dimension} height={252} />
        ))}
      </div>
      <CardSkeleton height={260} />
    </>
  );
}

export function HomeView() {
  const state = useViewState();
  const projects = useProjects();
  const session = useSession();
  const api = browserClient();
  const scope = api.period(state.period).human();

  return (
    <div className="mx-auto grid max-w-[1200px] gap-4">
      <header className="flex flex-wrap items-start justify-between gap-4 pb-2">
        <div className="grid gap-1">
          <h1 className="font-serif text-3xl tracking-tight">Overview</h1>
          <p className="text-sm text-muted">Traffic across every project you can read.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodSelect path="/" state={state} />
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
            <VisitorsCard
              scope={scope}
              period={state.period}
              projectCount={projects.projects.length}
            />
            <OnlineCard scope={scope} />
          </div>

          <div className="home-pair">
            <ProjectsCard scope={scope} period={state.period} projects={projects.projects} />
            <RankCard
              scope={scope}
              dimension="country"
              title="Top countries"
              description="Visitors by country."
              limit={8}
            />
          </div>

          <HeatMapCard scope={scope} period={state.period} />

          <div className="home-quad">
            {sources.map((source) => (
              <RankCard key={source.dimension} scope={scope} limit={listRows} {...source} />
            ))}
          </div>

          <VitalsCard
            scope={scope}
            period={state.period}
            projects={projects.projects}
            projectScope={(id) => api.project(id).period(state.period)}
          />
        </>
      )}
    </div>
  );
}
