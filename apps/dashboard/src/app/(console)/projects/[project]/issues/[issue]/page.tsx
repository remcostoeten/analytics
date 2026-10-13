import type { Metadata } from "next";
import { Link } from "@/shared/ui/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { IssueEvents } from "@/modules/analytics/components/issue-events";
import { IssueStatusControls } from "@/modules/analytics/components/issue-status-controls";
import { StatusBadge } from "@/modules/analytics/components/status-badge";
import { formatDateTime, formatMetric, formatRelative } from "@/modules/analytics/format";
import { splitTitle } from "@/modules/analytics/issues";
import { findProject, readScope } from "@/modules/analytics/reads";
import { readViewState, viewQuery } from "@/modules/analytics/view-state";
import type { SearchParams } from "@/modules/analytics/view-state";
import { ReadNotice } from "@/modules/session/components/read-notice";
import { readSession } from "@/modules/session/session";
import { FactsSkeleton, SectionSkeleton } from "@/modules/shell/components/skeletons";
import type { ProjectScope } from "@spoar/client";

type Props = {
  params: Promise<{ project: string; issue: string }>;
  searchParams: Promise<SearchParams>;
};

export const metadata: Metadata = { title: "Issue" };

type FactProps = { label: string; value: string; title?: string };

function Fact({ label, value, title }: FactProps) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm tabular-nums" title={title}>
        {value}
      </dd>
    </div>
  );
}

type IssueRead = ReturnType<ProjectScope["issue"]>;

async function Summary({ issue, project }: { issue: IssueRead; project: string }) {
  const [read, session] = await Promise.all([issue, readSession()]);
  if (!read.ok && read.error.code === "NOT_FOUND") notFound();
  if (!read.ok) return <ReadNotice error={read.error} what="this issue" />;
  const data = read.value.data;
  const title = splitTitle(data.title);
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid min-w-0 gap-1">
          <h1 className="font-serif text-2xl tracking-tight">
            <span className="font-semibold">{title.type}</span>
            {title.message ? `: ${title.message}` : ""}
          </h1>
          {data.culprit ? <p className="font-mono text-xs text-muted">{data.culprit}</p> : null}
          <StatusBadge status={data.status} regression={data.isRegression} />
        </div>
        {session.isAdmin ? (
          <IssueStatusControls project={project} issue={data.id} status={data.status} />
        ) : null}
      </div>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Fact label="Events" value={formatMetric(data.count, "count")} />
        <Fact label="Users" value={formatMetric(data.visitors, "count")} />
        <Fact
          label="Last seen"
          value={formatRelative(data.lastSeen)}
          title={formatDateTime(data.lastSeen)}
        />
        <Fact
          label="First seen"
          value={formatRelative(data.firstSeen)}
          title={formatDateTime(data.firstSeen)}
        />
        <Fact label="First release" value={data.firstRelease ?? "–"} />
        <Fact label="Last release" value={data.lastRelease ?? "–"} />
      </dl>
    </>
  );
}

async function Events({ issue, scope }: { issue: IssueRead; scope: Promise<ProjectScope> }) {
  const [read, resolved] = await Promise.all([issue, scope]);
  if (!read.ok) return null;
  return <IssueEvents scope={resolved} issue={read.value.data.id} />;
}

function SummarySkeleton() {
  return (
    <>
      <div className="grid gap-1" aria-hidden="true">
        <div className="skeleton h-8 w-96 max-w-full" />
        <div className="skeleton h-5 w-20" />
      </div>
      <FactsSkeleton facts={6} />
    </>
  );
}

export default async function Page({ params, searchParams }: Props) {
  const { project, issue: encodedIssue } = await params;
  const issueId = decodeURIComponent(encodedIssue);
  const state = readViewState(await searchParams);
  const listPath = `/projects/${encodeURIComponent(project)}/issues`;

  const found = await findProject(project);
  if (!found) notFound();
  const scope = readScope(project, state);
  const issue = scope.then((resolved) => resolved.issue(issueId));

  return (
    <div className="mx-auto grid max-w-[1200px] gap-6">
      <div className="panel">
        <header className="panel-section grid gap-4">
          <Link href={`${listPath}${viewQuery(state)}`} className="text-xs text-link underline">
            Back to issues
          </Link>
          <Suspense fallback={<SummarySkeleton />}>
            <Summary issue={issue} project={project} />
          </Suspense>
        </header>
        <Suspense fallback={<SectionSkeleton height={320} />}>
          <Events issue={issue} scope={scope} />
        </Suspense>
      </div>
    </div>
  );
}
