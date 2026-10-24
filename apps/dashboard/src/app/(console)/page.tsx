import type { Metadata } from "next";
import { Link } from "@/shared/ui/link";
import { Suspense } from "react";

import { PeriodSelect } from "@/modules/analytics/components/period-select";
import { listProjects } from "@/modules/analytics/reads";
import { readViewState } from "@/modules/analytics/view-state";
import type { SearchParams } from "@/modules/analytics/view-state";
import {
  HeatMapCard,
  OnlineCard,
  ProjectsCard,
  RankCard,
  VisitorsCard,
  VitalsCard,
} from "@/modules/home/components/home-sections";
import { readSession } from "@/modules/session/session";
import { EmptyState, ProjectIllustration } from "@/shared/ui/empty-state";
import { HomeSkeleton } from "@/modules/shell/components/skeletons";
import { serverClient } from "@/shared/api/server-client";
import { siteUrl } from "@/shared/config/site";

type Props = { searchParams: Promise<SearchParams> };

export const metadata: Metadata = { title: "Home" };

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

async function Home({ searchParams }: Props) {
  const state = readViewState(await searchParams);
  const [api, projects, session] = await Promise.all([
    serverClient(),
    listProjects(),
    readSession(),
  ]);
  const scope = api.period(state.period).human();
  const key = state.period;

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

      {!projects.ok ? (
        <p className="text-sm text-err">Could not list projects: {projects.error}</p>
      ) : projects.value.length === 0 ? (
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
            <Suspense key={`visitors${key}`} fallback={<CardSkeleton height={392} />}>
              <VisitorsCard
                scope={scope}
                period={state.period}
                projectCount={projects.value.length}
              />
            </Suspense>
            <Suspense key={`online${key}`} fallback={<CardSkeleton height={392} />}>
              <OnlineCard scope={scope} />
            </Suspense>
          </div>

          <div className="home-pair">
            <Suspense key={`projects${key}`} fallback={<CardSkeleton height={340} />}>
              <ProjectsCard scope={scope} period={state.period} projects={projects.value} />
            </Suspense>
            <Suspense key={`countries${key}`} fallback={<CardSkeleton height={340} />}>
              <RankCard
                scope={scope}
                dimension="country"
                title="Top countries"
                description="Visitors by country."
                limit={8}
              />
            </Suspense>
          </div>

          <Suspense key={`map${key}`} fallback={<CardSkeleton height={460} />}>
            <HeatMapCard scope={scope} period={state.period} />
          </Suspense>

          <div className="home-quad">
            {sources.map((source) => (
              <Suspense key={`${source.dimension}${key}`} fallback={<CardSkeleton height={252} />}>
                <RankCard scope={scope} limit={listRows} {...source} />
              </Suspense>
            ))}
          </div>

          <Suspense key={`vitals${key}`} fallback={<CardSkeleton height={260} />}>
            <VitalsCard
              scope={scope}
              period={state.period}
              projects={projects.value}
              projectScope={(id) => api.project(id).period(state.period)}
            />
          </Suspense>
        </>
      )}
    </div>
  );
}

export default function Page({ searchParams }: Props) {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <Home searchParams={searchParams} />
    </Suspense>
  );
}
