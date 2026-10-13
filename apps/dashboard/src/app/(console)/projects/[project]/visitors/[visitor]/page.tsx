import type { Metadata } from "next";
import { Link } from "@/shared/ui/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { VisitList, VisitorFacts } from "@/modules/analytics/components/visitor-detail";
import { findProject, readScope } from "@/modules/analytics/reads";
import { readViewState, viewQuery } from "@/modules/analytics/view-state";
import type { SearchParams } from "@/modules/analytics/view-state";
import { ReadNotice } from "@/modules/session/components/read-notice";
import { FactsSkeleton, SectionSkeleton } from "@/modules/shell/components/skeletons";
import type { ProjectScope } from "@spoar/client";

type Props = {
  params: Promise<{ project: string; visitor: string }>;
  searchParams: Promise<SearchParams>;
};

export const metadata: Metadata = { title: "Visitor" };

type Detail = ReturnType<ProjectScope["visitor"]>;

type DetailProps = { detail: Detail; sessionHref: (session: string) => string };

async function Facts({ detail, sessionHref }: DetailProps) {
  const read = await detail;
  if (!read.ok && read.error.code === "NOT_FOUND") notFound();
  return read.ok ? (
    <VisitorFacts detail={read.value.data} sessionHref={sessionHref} />
  ) : (
    <ReadNotice error={read.error} what="this visitor" />
  );
}

async function Visits({
  detail,
  sessionHref,
  scope,
}: DetailProps & { scope: Promise<ProjectScope> }) {
  const [read, resolved] = await Promise.all([detail, scope]);
  if (!read.ok) return null;
  return <VisitList scope={resolved} visitor={read.value.data.id} sessionHref={sessionHref} />;
}

export default async function Page({ params, searchParams }: Props) {
  const { project, visitor: encodedVisitor } = await params;
  const visitor = decodeURIComponent(encodedVisitor);
  const state = readViewState(await searchParams);
  const base = `/projects/${encodeURIComponent(project)}`;

  const found = await findProject(project);
  if (!found) notFound();
  const scope = readScope(project, state);
  const detail = scope.then((resolved) => resolved.visitor(visitor));

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
            <h1 className="font-serif text-2xl tracking-tight">
              Visitor <span className="font-mono">{visitor.slice(0, 8)}</span>
            </h1>
            <span className="font-mono text-xs text-muted">{found.domain}</span>
          </div>
          <Suspense fallback={<FactsSkeleton facts={6} />}>
            <Facts detail={detail} sessionHref={sessionHref} />
          </Suspense>
        </header>
        <Suspense fallback={<SectionSkeleton height={320} />}>
          <Visits detail={detail} sessionHref={sessionHref} scope={scope} />
        </Suspense>
      </div>
    </div>
  );
}
