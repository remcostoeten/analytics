"use client";

import { notify } from "@remcostoeten/notifier";
import type { IssueStatus } from "@spoar/contract";
import type { IssueID } from "@spoar/shared/semantic";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { updateIssueStatus } from "../actions";
import { nextStatuses, statusLabels } from "../issues";

type Props = { project: string; issue: IssueID; status: IssueStatus };

export function IssueStatusControls({ project, issue, status }: Props) {
  const router = useRouter();
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
            const result = await updateIssueStatus(project, issue, action.status);
            setBusy(null);
            if (!result.ok) {
              notify.error(result.error.message);
              return;
            }
            notify.success(`Issue ${statusLabels[result.value.data.status].toLowerCase()}`);
            router.refresh();
          }}
        >
          {busy === action.status ? `${action.label}…` : action.label}
        </button>
      ))}
    </div>
  );
}
