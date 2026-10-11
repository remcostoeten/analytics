import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AddFilter } from "@/modules/analytics/components/add-filter";
import { EventLog } from "@/modules/analytics/components/event-log";
import { FieldSidebar } from "@/modules/analytics/components/field-sidebar";
import { FilterChips } from "@/modules/analytics/components/filter-chips";
import { OutcomeSection } from "@/modules/analytics/components/outcome-section";
import { PeriodSelect } from "@/modules/analytics/components/period-select";
import { logPath, logTraffic, trafficOptions } from "@/modules/analytics/logs";
import { listProjects, readScope } from "@/modules/analytics/reads";
import { readViewState, viewQuery } from "@/modules/analytics/view-state";
import type { SearchParams } from "@/modules/analytics/view-state";
import { SectionSkeleton } from "@/modules/shell/components/skeletons";

type Props = {
  params: Promise<{ project: string; traffic?: string[] }>;
  searchParams: Promise<SearchParams>;
};

export const metadata: Metadata = { title: "Logs" };

function FieldsSkeleton() {
  return (
    <div className="field-sidebar" aria-hidden="true">
      <div className="skeleton h-[420px]" />
    </div>
  );
}

export default async function Page({ params, searchParams }: Props) {
  const { project, traffic: segments } = await params;
  const query = await searchParams;
  const state = { ...readViewState(query), bots: false };
  const cursor = Array.isArray(query.cursor) ? query.cursor[0] : query.cursor;
  const traffic = logTraffic(segments?.[0]);
  if (segments && (segments.length > 1 || traffic === "all")) notFound();
  const base = `/projects/${encodeURIComponent(project)}`;
  const path = logPath(base, traffic);

  const [projects, scope] = await Promise.all([listProjects(), readScope(project, state)]);
  const found = projects.ok ? projects.value.find((entry) => entry.id === project) : undefined;
  if (!found) notFound();
  const scoped = scope.traffic(traffic);
  const key = `${path}${viewQuery(state)}`;

  return (
    <div className="grid gap-4">
      <header className="log-toolbar">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-3xl tracking-tight">Logs</h1>
          <span className="font-mono text-xs text-muted">{found.domain}</span>
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
                  prefetch={false}
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
        <Suspense key={`fields${key}`} fallback={<FieldsSkeleton />}>
          <FieldSidebar scope={scoped} state={state} path={path} />
        </Suspense>
        <div className="grid min-w-0 content-start gap-4">
          <div className="panel">
            <Suspense key={`outcomes${key}`} fallback={<SectionSkeleton height={280} />}>
              <OutcomeSection scope={scope} />
            </Suspense>
          </div>
          <div className="panel">
            <Suspense key={`log${key}${cursor ?? ""}`} fallback={<SectionSkeleton height={480} />}>
              <EventLog scope={scoped} state={state} path={path} base={base} cursor={cursor} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
