"use client";

import type { ProjectScope } from "@spoar/client";
import { Link } from "@/shared/ui/link";

import { ReadNotice } from "@/modules/session/components/read-notice";
import { GhostSection } from "@/modules/shell/components/ghost";
import { useReadOf } from "@/shared/query/read";
import { BugIcon } from "@/shared/ui/icons";
import { EmptyState, IconStack } from "@/shared/ui/empty-state";

import { formatDateTime, formatMetric, formatRelative } from "../format";
import { splitTitle } from "../issues";
import { issuesQuery } from "../queries";
import { issueStatuses, viewQuery } from "../view-state";
import type { ViewState } from "../view-state";
import { StatusBadge } from "./status-badge";

type Props = { scope: ProjectScope; state: ViewState; path: string; cursor: string | undefined };

export function IssueStatusTabs({ path, state }: Pick<Props, "path" | "state">) {
  return (
    <nav aria-label="Status" className="tabs">
      {issueStatuses.map((status) => (
        <Link
          key={status.value}
          href={`${path}${viewQuery({ ...state, status: status.value })}`}
          aria-current={state.status === status.value ? "page" : undefined}
          className="tab"
          scroll={false}
        >
          {status.label}
        </Link>
      ))}
    </nav>
  );
}

export function IssueList({ scope, state, path, cursor }: Props) {
  const issues = useReadOf(issuesQuery(scope, state.status, cursor));
  if (issues.data === undefined) return <GhostSection kind="list" height={320} rows={6} />;
  const read = issues.data;
  if (!read.ok) return <ReadNotice error={read.error} what="issues" />;
  const rows = read.value.data;
  return (
    <section className="panel-section grid gap-4">
      {rows.length === 0 ? (
        <EmptyState
          title={`No ${state.status} issues`}
          description="Errors the SDK reports are grouped here."
          illustration={<IconStack icon={<BugIcon />} />}
        />
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Issue</th>
                <th scope="col">Status</th>
                <th scope="col" className="text-right">
                  Events
                </th>
                <th scope="col" className="text-right">
                  Users
                </th>
                <th scope="col" className="text-right">
                  Last seen
                </th>
                <th scope="col" className="text-right">
                  First seen
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((issue) => {
                const { type, message } = splitTitle(issue.title);
                return (
                  <tr key={issue.id}>
                    <td className="max-w-[48ch]">
                      <Link
                        href={`${path}/${encodeURIComponent(issue.id)}${viewQuery(state)}`}
                        className="grid gap-0.5 hover:underline"
                      >
                        <span className="flex items-baseline gap-2">
                          <span className="font-medium">{type}</span>
                          {issue.level === "warning" ? (
                            <span className="rating rating-needs-improvement">warning</span>
                          ) : null}
                        </span>
                        <span className="truncate text-xs text-muted">{message || "–"}</span>
                        {issue.culprit ? (
                          <span className="truncate font-mono text-[11px] text-muted">
                            {issue.culprit}
                          </span>
                        ) : null}
                      </Link>
                    </td>
                    <td>
                      <StatusBadge status={issue.status} regression={issue.isRegression} />
                    </td>
                    <td className="text-right tabular-nums">
                      {formatMetric(issue.count, "count")}
                    </td>
                    <td className="text-right tabular-nums">
                      {formatMetric(issue.visitors, "count")}
                    </td>
                    <td
                      className="text-right text-xs whitespace-nowrap text-muted"
                      title={formatDateTime(issue.lastSeen)}
                    >
                      {formatRelative(issue.lastSeen)}
                    </td>
                    <td
                      className="text-right text-xs whitespace-nowrap text-muted"
                      title={formatDateTime(issue.firstSeen)}
                    >
                      {formatRelative(issue.firstSeen)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {read.value.nextCursor ? (
        <div className="flex justify-end">
          <Link
            href={`${path}${viewQuery(state)}${viewQuery(state) ? "&" : "?"}cursor=${encodeURIComponent(read.value.nextCursor)}`}
            className="ghost-button"
          >
            Next page
          </Link>
        </div>
      ) : null}
    </section>
  );
}
