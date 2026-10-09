import type { IssueStatus } from "@spoar/contract";

import { statusLabels } from "../issues";

type Props = { status: IssueStatus; regression?: boolean };

export function StatusBadge({ status, regression = false }: Props) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className={`rating status-${status}`}>{statusLabels[status]}</span>
      {regression ? <span className="rating rating-poor">Regression</span> : null}
    </span>
  );
}
