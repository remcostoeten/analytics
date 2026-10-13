import type { Metadata } from "next";
import { Link } from "@/shared/ui/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SessionTrail } from "@/modules/analytics/components/session-trail";
import { formatDateTime, formatDuration } from "@/modules/analytics/format";
import { findProject, readScope } from "@/modules/analytics/reads";
import { collectTrail, trailMaxPages, trailPageSize } from "@/modules/analytics/trail";
import { readViewState, viewQuery } from "@/modules/analytics/view-state";
import type { SearchParams } from "@/modules/analytics/view-state";
import { ReadNotice } from "@/modules/session/components/read-notice";
import { FactsSkeleton, SectionSkeleton } from "@/modules/shell/components/skeletons";

type Props = {
  params: Promise<{ project: string; session: string }>;
  searchParams: Promise<SearchParams>;
};

export const metadata: Metadata = { title: "Session" };

type Trail = ReturnType<typeof collectTrail>;

type FactsProps = { trail: Trail; base: string; query: string };

async function SessionFacts({ trail, base, query }: FactsProps) {
  const read = await trail;
  if (!read.ok) return null;
  const { session } = read.value;
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

async function Steps({ trail }: Pick<FactsProps, "trail">) {
  const read = await trail;
  if (!read.ok && read.error.code === "NOT_FOUND") notFound();
  return read.ok ? (
    <SessionTrail events={read.value} />
  ) : (
    <ReadNotice error={read.error} what="this session" />
  );
}

export default async function Page({ params, searchParams }: Props) {
  const { project, session: encodedSession } = await params;
  const session = decodeURIComponent(encodedSession);
  const state = readViewState(await searchParams);
  const base = `/projects/${encodeURIComponent(project)}`;

  const found = await findProject(project);
  if (!found) notFound();
  const trail = readScope(project, state).then((scope) =>
    collectTrail(
      (cursor) => scope.sessionEvents(session, { limit: trailPageSize, cursor }),
      trailMaxPages,
    ),
  );

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
              Session <span className="font-mono">{session.slice(0, 8)}</span>
            </h1>
            <span className="font-mono text-xs text-muted">{found.domain}</span>
          </div>
          <Suspense fallback={<FactsSkeleton facts={4} />}>
            <SessionFacts trail={trail} base={base} query={viewQuery(state)} />
          </Suspense>
        </header>
        <Suspense fallback={<SectionSkeleton height={360} />}>
          <Steps trail={trail} />
        </Suspense>
      </div>
    </div>
  );
}
