"use client";

import { ProjectHeading } from "@/modules/shell/components/project-heading";

import { useProjectView } from "../use-view";
import { IssueList, IssueStatusTabs } from "./issue-list";

export function IssuesView() {
  const { project, state, cursor, base, scope } = useProjectView();
  const path = `${base}/issues`;

  return (
    <div className="mx-auto grid max-w-[1200px] gap-6">
      <div className="panel">
        <ProjectHeading project={project} title="Issues for">
          <p className="text-sm text-muted">
            Errors grouped by type, message and the top in-app frame, most recently seen first.
            Issues are not narrowed by the time range or filters.
          </p>
          <IssueStatusTabs path={path} state={state} />
        </ProjectHeading>
        <IssueList scope={scope} state={state} path={path} cursor={cursor} />
      </div>
    </div>
  );
}
