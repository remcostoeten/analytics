"use client";

import { notify } from "@remcostoeten/notifier";
import type { IssueStatus } from "@spoar/contract";
import type { IssueID } from "@spoar/shared/semantic";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { browserClient } from "@/shared/api/browser-client";
import { invalidateRoute } from "@/shared/query/read";

import { nextStatuses, statusLabels } from "../issues";

type Props = { project: string; issue: IssueID; status: IssueStatus };

export function IssueStatusControls({ project, issue, status }: Props) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<IssueStatus | null>(null);
  return (
    <div className="flex flex-wrap gap-2">
      {nextStatuses(status).map((action) => (
        <button
          key={action.status}
          type="button"
          className={action.status === "resolved" ? "solid-button" : "ghost-button"}
          disabled={busy !== null}
          onClick={async () => {
            setBusy(action.status);
            const result = await browserClient()
              .project(project)
              .updateIssue(issue, { status: action.status });
            setBusy(null);
            if (!result.ok) {
              notify.error(result.error.message);
              return;
            }
            notify.success(`Issue ${statusLabels[result.value.data.status].toLowerCase()}`);
            await invalidateRoute(queryClient, "issues");
            await invalidateRoute(queryClient, "issue");
          }}
        >
          {busy === action.status ? `${action.label}…` : action.label}
        </button>
      ))}
    </div>
  );
}
