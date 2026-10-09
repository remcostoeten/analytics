import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SessionTrail } from "@/modules/analytics/components/session-trail";
import { formatDateTime, formatDuration } from "@/modules/analytics/format";
import { listProjects, readScope } from "@/modules/analytics/reads";
import { collectTrail, trailMaxPages, trailPageSize } from "@/modules/analytics/trail";
import { readViewState, viewQuery } from "@/modules/analytics/view-state";
import type { SearchParams } from "@/modules/analytics/view-state";
import { ReadNotice } from "@/modules/session/components/read-notice";

type Props = {
  params: Promise<{ project: string; session: string }>;
  searchParams: Promise<SearchParams>;
};

export const metadata: Metadata = { title: "Session" };

export default async function Page({ params, searchParams }: Props) {
  const { project, session: encodedSession } = await params;
  const session = decodeURIComponent(encodedSession);
  const state = readViewState(await searchParams);
  const base = `/projects/${encodeURIComponent(project)}`;

  const [projects, scope] = await Promise.all([listProjects(), readScope(project, state)]);
  const found = projects.ok ? projects.value.find((entry) => entry.id === project) : undefined;
  if (!found) notFound();

  const read = await collectTrail(
    (cursor) => scope.sessionEvents(session, { limit: trailPageSize, cursor }),
    trailMaxPages,
  );
  if (!read.ok && read.error.code === "NOT_FOUND") notFound();

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
            <h1 className="text-xl font-normal tracking-tight">
              Session <span className="font-mono">{session.slice(0, 8)}</span>
            </h1>
            <span className="font-mono text-xs text-muted">{found.domain}</span>
          </div>
          {read.ok ? (
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="grid gap-0.5">
                <dt className="text-xs text-muted">Visitor</dt>
                <dd className="text-sm">
                  <Link
                    href={`${base}/visitors/${encodeURIComponent(read.value.session.visitor)}${viewQuery(state)}`}
                    className="font-mono hover:underline"
                    prefetch={false}
                  >
                    {read.value.session.visitor.slice(0, 8)}
                  </Link>
                </dd>
              </div>
              <div className="grid gap-0.5">
                <dt className="text-xs text-muted">Started</dt>
                <dd className="text-sm tabular-nums">
                  {formatDateTime(read.value.session.startedAt)} UTC
                </dd>
              </div>
              <div className="grid gap-0.5">
                <dt className="text-xs text-muted">Duration</dt>
                <dd className="text-sm tabular-nums">
                  {formatDuration(read.value.session.durationMs)}
                </dd>
              </div>
              <div className="grid gap-0.5">
                <dt className="text-xs text-muted">Bot score</dt>
                <dd className="text-sm">
                  <span
                    className={`rating ${read.value.session.bot.score >= 50 ? "rating-poor" : read.value.session.bot.score >= 25 ? "rating-needs-improvement" : "rating-good"}`}
                  >
                    {read.value.session.bot.score}
                    {read.value.session.bot.reasons.length > 0
                      ? ` · ${read.value.session.bot.reasons.join(", ")}`
                      : ""}
                  </span>
                </dd>
              </div>
            </dl>
          ) : null}
        </header>
        {read.ok ? (
          <SessionTrail events={read.value} />
        ) : (
          <ReadNotice error={read.error} what="this session" />
        )}
      </div>
    </div>
  );
}
