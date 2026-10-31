"use client";

import type { IssueID } from "@spoar/shared/semantic";
import { Link } from "@/shared/ui/link";
import { notFound } from "next/navigation";

import { ReadNotice } from "@/modules/session/components/read-notice";
import { useSession } from "@/modules/session/use-session";
import { FactsSkeleton } from "@/modules/shell/components/skeletons";
import { useRead } from "@/shared/query/read";

import { formatDateTime, formatMetric, formatRelative } from "../format";
import { splitTitle } from "../issues";
import { useProject } from "../use-projects";
import { useProjectView } from "../use-view";
import { viewQuery } from "../view-state";
import { IssueEvents } from "./issue-events";
import { IssueStatusControls } from "./issue-status-controls";
import { StatusBadge } from "./status-badge";

type Props = { label: string; value: string; title?: string };

function Fact({ label, value, title }: Props) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm tabular-nums" title={title}>
        {value}
      </dd>
    </div>
  );
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

export function IssueView() {
  const { project, params, state, base, scope } = useProjectView();
  const issueId: IssueID = decodeURIComponent(params.issue ?? "");
  const listPath = `${base}/issues`;
  const found = useProject(project);
  const session = useSession();
  const issue = useRead(scope.key("issue", issueId), () => scope.issue(issueId));
  if (found.status === "missing") notFound();
  const read = issue.data;
  if (read && !read.ok && read.error.code === "NOT_FOUND") notFound();
  const data = read?.ok ? read.value.data : null;
  const title = data ? splitTitle(data.title) : null;

  return (
    <div className="mx-auto grid max-w-[1200px] gap-6">
      <div className="panel">
        <header className="panel-section grid gap-4">
          <Link href={`${listPath}${viewQuery(state)}`} className="text-xs text-link underline">
            Back to issues
          </Link>
          {read === undefined ? (
            <SummarySkeleton />
          ) : !read.ok ? (
            <ReadNotice error={read.error} what="this issue" />
          ) : data && title ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="grid min-w-0 gap-1">
                  <h1 className="font-serif text-2xl tracking-tight">
                    <span className="font-semibold">{title.type}</span>
                    {title.message ? `: ${title.message}` : ""}
                  </h1>
                  {data.culprit ? (
                    <p className="font-mono text-xs text-muted">{data.culprit}</p>
                  ) : null}
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
          ) : null}
        </header>
        {data ? <IssueEvents scope={scope} issue={data.id} /> : null}
      </div>
    </div>
  );
}
