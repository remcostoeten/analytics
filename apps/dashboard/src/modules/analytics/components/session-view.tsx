"use client";

import type { SessionEvents } from "@spoar/contract";
import { GhostSection } from "@/modules/shell/components/ghost";
import { Link } from "@/shared/ui/link";
import { notFound } from "next/navigation";

import { ReadNotice } from "@/modules/session/components/read-notice";
import { FactsSkeleton } from "@/modules/shell/components/skeletons";
import { useRead } from "@/shared/query/read";

import { formatDateTime, formatDuration } from "../format";
import { collectTrail, trailMaxPages, trailPageSize } from "../trail";
import { useProject } from "../use-projects";
import { useProjectView } from "../use-view";
import { viewQuery } from "../view-state";
import { SessionTrail } from "./session-trail";

type Props = { session: SessionEvents["session"]; base: string; query: string };

function SessionFacts({ session, base, query }: Props) {
  return (
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div className="grid gap-0.5">
        <dt className="text-xs text-muted">Visitor</dt>
        <dd className="text-sm">
          <Link
            href={`${base}/visitors/${encodeURIComponent(session.visitor)}${query}`}
            className="font-mono hover:underline"
          >
            {session.visitor.slice(0, 8)}
          </Link>
        </dd>
      </div>
      <div className="grid gap-0.5">
        <dt className="text-xs text-muted">Started</dt>
        <dd className="text-sm tabular-nums">{formatDateTime(session.startedAt)} UTC</dd>
      </div>
      <div className="grid gap-0.5">
        <dt className="text-xs text-muted">Duration</dt>
        <dd className="text-sm tabular-nums">{formatDuration(session.durationMs)}</dd>
      </div>
      <div className="grid gap-0.5">
        <dt className="text-xs text-muted">Bot score</dt>
        <dd className="text-sm">
          <span
            className={`rating ${session.bot.score >= 50 ? "rating-poor" : session.bot.score >= 25 ? "rating-needs-improvement" : "rating-good"}`}
          >
            {session.bot.score}
            {session.bot.reasons.length > 0 ? ` · ${session.bot.reasons.join(", ")}` : ""}
          </span>
        </dd>
      </div>
    </dl>
  );
}

export function SessionView() {
  const { project, params, state, base, scope } = useProjectView();
  const session = decodeURIComponent(params.session ?? "");
  const found = useProject(project);
  const trail = useRead(
    [...scope.key("sessionEvents", session, { limit: trailPageSize }), "trail"],
    () =>
      collectTrail(
        (cursor) => scope.sessionEvents(session, { limit: trailPageSize, cursor }),
        trailMaxPages,
      ),
  );
  if (found.status === "missing") notFound();
  const read = trail.data;
  if (read && !read.ok && read.error.code === "NOT_FOUND") notFound();
  const query = viewQuery(state);

  return (
    <div className="mx-auto grid max-w-[1200px] gap-6">
      <div className="panel">
        <header className="panel-section grid gap-4">
          <Link href={`${base}/visitors${query}`} className="text-xs text-link underline">
            Back to visitors
          </Link>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="font-serif text-2xl tracking-tight">
              Session <span className="font-mono">{session.slice(0, 8)}</span>
            </h1>
            {found.status === "ok" ? (
              <span className="font-mono text-xs text-muted">{found.project.domain}</span>
            ) : null}
          </div>
          {read === undefined ? (
            <FactsSkeleton facts={4} />
          ) : read.ok ? (
            <SessionFacts session={read.value.session} base={base} query={query} />
          ) : null}
        </header>
        {read === undefined ? (
          <GhostSection kind="list" height={360} rows={7} />
        ) : read.ok ? (
          <SessionTrail events={read.value} />
        ) : (
          <ReadNotice error={read.error} what="this session" />
        )}
      </div>
    </div>
  );
}
