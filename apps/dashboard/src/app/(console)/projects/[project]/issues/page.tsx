import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { IssueList, IssueStatusTabs } from "@/modules/analytics/components/issue-list";
import { listProjects, readScope } from "@/modules/analytics/reads";
import { readViewState, viewQuery } from "@/modules/analytics/view-state";
import type { SearchParams } from "@/modules/analytics/view-state";
import { ProjectHeader } from "@/modules/shell/components/project-header";
import { SectionSkeleton } from "@/modules/shell/components/skeletons";

type Props = { params: Promise<{ project: string }>; searchParams: Promise<SearchParams> };

export const metadata: Metadata = { title: "Issues" };

export default async function Page({ params, searchParams }: Props) {
  const { project } = await params;
  const query = await searchParams;
  const state = readViewState(query);
  const cursor = Array.isArray(query.cursor) ? query.cursor[0] : query.cursor;
  const path = `/projects/${encodeURIComponent(project)}/issues`;

  const [projects, scope] = await Promise.all([listProjects(), readScope(project, state)]);
  const found = projects.ok ? projects.value.find((entry) => entry.id === project) : undefined;
  if (!found) notFound();

  return (
    <div className="mx-auto grid max-w-[1200px] gap-6">
      <div className="panel">
        <ProjectHeader title={`Issues for ${found.name}`} domain={found.domain}>
          <p className="text-sm text-muted">
            Errors grouped by type, message and the top in-app frame, most recently seen first.
            Issues are not narrowed by the time range or filters.
          </p>
          <IssueStatusTabs path={path} state={state} />
        </ProjectHeader>
        <Suspense
          key={`${viewQuery(state)}${cursor ?? ""}`}
          fallback={<SectionSkeleton height={320} />}
        >
          <IssueList scope={scope} state={state} path={path} cursor={cursor} />
        </Suspense>
      </div>
    </div>
  );
}
