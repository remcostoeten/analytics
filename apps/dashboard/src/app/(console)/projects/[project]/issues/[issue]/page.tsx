import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { IssueEvents } from "@/modules/analytics/components/issue-events";
import { IssueStatusControls } from "@/modules/analytics/components/issue-status-controls";
import { StatusBadge } from "@/modules/analytics/components/status-badge";
import { formatDateTime, formatMetric, formatRelative } from "@/modules/analytics/format";
import { splitTitle } from "@/modules/analytics/issues";
import { listProjects, readScope } from "@/modules/analytics/reads";
import { readViewState, viewQuery } from "@/modules/analytics/view-state";
import type { SearchParams } from "@/modules/analytics/view-state";
import { ReadNotice } from "@/modules/session/components/read-notice";
import { readSession } from "@/modules/session/session";
import { SectionSkeleton } from "@/modules/shell/components/skeletons";

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

export default async function Page({ params, searchParams }: Props) {
  const { project, issue: encodedIssue } = await params;
  const issueId = decodeURIComponent(encodedIssue);
  const state = readViewState(await searchParams);
  const listPath = `/projects/${encodeURIComponent(project)}/issues`;

  const [projects, session, scope] = await Promise.all([
    listProjects(),
    readSession(),
    readScope(project, state),
  ]);
  const found = projects.ok ? projects.value.find((entry) => entry.id === project) : undefined;
  if (!found) notFound();

  const read = await scope.issue(issueId);
  if (!read.ok && read.error.code === "NOT_FOUND") notFound();

  return (
    <div className="mx-auto grid max-w-[1200px] gap-6">
      <div className="panel">
        <header className="panel-section grid gap-4">
          <Link href={`${listPath}${viewQuery(state)}`} className="text-xs text-link underline">
            Back to issues
          </Link>
          {!read.ok ? (
            <ReadNotice error={read.error} what="this issue" />
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="grid min-w-0 gap-1">
                  <h1 className="text-xl font-normal tracking-tight">
                    <span className="font-semibold">{splitTitle(read.value.data.title).type}</span>
                    {splitTitle(read.value.data.title).message
                      ? `: ${splitTitle(read.value.data.title).message}`
                      : ""}
                  </h1>
                  {read.value.data.culprit ? (
                    <p className="font-mono text-xs text-muted">{read.value.data.culprit}</p>
                  ) : null}
                  <StatusBadge
                    status={read.value.data.status}
                    regression={read.value.data.isRegression}
                  />
                </div>
                {session.isAdmin ? (
                  <IssueStatusControls
                    project={project}
                    issue={read.value.data.id}
                    status={read.value.data.status}
                  />
                ) : null}
              </div>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <Fact label="Events" value={formatMetric(read.value.data.count, "count")} />
                <Fact label="Users" value={formatMetric(read.value.data.visitors, "count")} />
                <Fact
                  label="Last seen"
                  value={formatRelative(read.value.data.lastSeen)}
                  title={formatDateTime(read.value.data.lastSeen)}
                />
                <Fact
                  label="First seen"
                  value={formatRelative(read.value.data.firstSeen)}
                  title={formatDateTime(read.value.data.firstSeen)}
                />
                <Fact label="First release" value={read.value.data.firstRelease ?? "–"} />
                <Fact label="Last release" value={read.value.data.lastRelease ?? "–"} />
              </dl>
            </>
          )}
        </header>
        {read.ok ? (
          <Suspense fallback={<SectionSkeleton height={320} />}>
            <IssueEvents scope={scope} issue={read.value.data.id} />
          </Suspense>
        ) : null}
      </div>
    </div>
  );
}
