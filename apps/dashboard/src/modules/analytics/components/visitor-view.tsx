"use client";

import type { VisitorID } from "@spoar/shared/semantic";
import { Link } from "@/shared/ui/link";
import { notFound } from "next/navigation";

import { ReadNotice } from "@/modules/session/components/read-notice";
import { FactsSkeleton } from "@/modules/shell/components/skeletons";
import { useRead } from "@/shared/query/read";

import { useProject } from "../use-projects";
import { useProjectView } from "../use-view";
import { viewQuery } from "../view-state";
import { VisitList, VisitorFacts } from "./visitor-detail";

export function VisitorView() {
  const { project, params, state, base, scope } = useProjectView();
  const visitor: VisitorID = decodeURIComponent(params.visitor ?? "");
  const found = useProject(project);
  const detail = useRead(scope.key("visitor", visitor), () => scope.visitor(visitor));
  if (found.status === "missing") notFound();
  const read = detail.data;
  if (read && !read.ok && read.error.code === "NOT_FOUND") notFound();

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
            {found.status === "ok" ? (
              <span className="font-mono text-xs text-muted">{found.project.domain}</span>
            ) : null}
          </div>
          {read === undefined ? (
            <FactsSkeleton facts={6} />
          ) : read.ok ? (
            <VisitorFacts detail={read.value.data} sessionHref={sessionHref} />
          ) : (
            <ReadNotice error={read.error} what="this visitor" />
          )}
        </header>
        {read?.ok ? (
          <VisitList scope={scope} visitor={read.value.data.id} sessionHref={sessionHref} />
        ) : null}
      </div>
    </div>
  );
}
