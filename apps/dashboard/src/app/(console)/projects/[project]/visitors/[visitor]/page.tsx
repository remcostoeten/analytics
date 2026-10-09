import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { VisitList, VisitorFacts } from "@/modules/analytics/components/visitor-detail";
import { listProjects, readScope } from "@/modules/analytics/reads";
import { readViewState, viewQuery } from "@/modules/analytics/view-state";
import type { SearchParams } from "@/modules/analytics/view-state";
import { ReadNotice } from "@/modules/session/components/read-notice";
import { SectionSkeleton } from "@/modules/shell/components/skeletons";

type Props = {
  params: Promise<{ project: string; visitor: string }>;
  searchParams: Promise<SearchParams>;
};

export const metadata: Metadata = { title: "Visitor" };

export default async function Page({ params, searchParams }: Props) {
  const { project, visitor: encodedVisitor } = await params;
  const visitor = decodeURIComponent(encodedVisitor);
  const state = readViewState(await searchParams);
  const base = `/projects/${encodeURIComponent(project)}`;

  const [projects, scope] = await Promise.all([listProjects(), readScope(project, state)]);
  const found = projects.ok ? projects.value.find((entry) => entry.id === project) : undefined;
  if (!found) notFound();

  const read = await scope.visitor(visitor);
  if (!read.ok && read.error.code === "NOT_FOUND") notFound();

  function sessionHref(session: string) {
    return `${base}/sessions/${encodeURIComponent(session)}${viewQuery(state)}`;
  }

  return (
    <div className="mx-auto grid max-w-[1200px] gap-6">
      <div className="panel">
        <header className="panel-section grid gap-4">
          <Link
            href={`${base}/visitors${viewQuery(state)}`}
            className="text-xs text-link underline"
          >
            Back to visitors
          </Link>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-xl font-normal tracking-tight">
              Visitor <span className="font-mono">{visitor.slice(0, 8)}</span>
            </h1>
            <span className="font-mono text-xs text-muted">{found.domain}</span>
          </div>
          {!read.ok ? (
            <ReadNotice error={read.error} what="this visitor" />
          ) : (
            <VisitorFacts detail={read.value.data} sessionHref={sessionHref} />
          )}
        </header>
        {read.ok ? (
          <Suspense fallback={<SectionSkeleton height={320} />}>
            <VisitList scope={scope} visitor={read.value.data.id} sessionHref={sessionHref} />
          </Suspense>
        ) : null}
      </div>
    </div>
  );
}
