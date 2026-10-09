import type { ProjectScope } from "@spoar/client";
import type { VisitorDetail as Detail } from "@spoar/contract";
import type { VisitorID } from "@spoar/shared/semantic";
import Link from "next/link";

import { ReadNotice } from "@/modules/session/components/read-notice";

import {
  formatDateTime,
  formatDimensionValue,
  formatDuration,
  formatMetric,
  formatRelative,
} from "../format";
import { formatProps } from "../trail";

type Props = { scope: ProjectScope; visitor: VisitorID; sessionHref: (session: string) => string };

type FactProps = { label: string; value: string; title?: string };

function Fact({ label, value, title }: FactProps) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm tabular-nums" title={title}>
        {value}
      </dd>
    </div>
  );
}

function place(geo: Detail["data"]["geo"]) {
  return (
    [geo.city, geo.region, geo.country ? formatDimensionValue("country", geo.country) : null]
      .filter(Boolean)
      .join(", ") || "Unknown"
  );
}

function device(detail: Detail["data"]["device"]) {
  const browser = [detail.browser, detail.browserVersion].filter(Boolean).join(" ");
  const os = [detail.os, detail.osVersion].filter(Boolean).join(" ");
  return [browser, os].filter(Boolean).join(" on ") || detail.type;
}

const signalLabels = {
  headless: "Headless browser",
  webdriver: "WebDriver flag",
  datacenterAsn: "Datacenter network",
  pointerEvents: "No pointer input",
  uaMismatch: "User agent mismatch",
  uniformDwell: "Uniform dwell times",
} as const satisfies { [Signal in keyof Detail["data"]["bot"]["signals"]]: string };

export function VisitorFacts({
  detail,
  sessionHref,
}: {
  detail: Detail["data"];
  sessionHref: Props["sessionHref"];
}) {
  const fired = Object.entries(detail.bot.signals).filter(([, value]) => value === true);
  return (
    <>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Fact label="Visits" value={formatMetric(detail.visitCount, "count")} />
        <Fact label="Pageviews" value={formatMetric(detail.pageviews, "count")} />
        <Fact label="Events" value={formatMetric(detail.events, "count")} />
        <Fact label="Days active" value={formatMetric(detail.daysActive, "count")} />
        <Fact
          label="First seen"
          value={formatRelative(detail.firstSeen)}
          title={formatDateTime(detail.firstSeen)}
        />
        <Fact
          label="Last seen"
          value={formatRelative(detail.lastSeen)}
          title={formatDateTime(detail.lastSeen)}
        />
      </dl>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="Place" value={place(detail.geo)} />
        <Fact label="Device" value={device(detail.device)} />
        <Fact
          label="Between visits"
          value={
            detail.medianDaysBetweenVisits === null
              ? "One visit"
              : `${detail.medianDaysBetweenVisits} days (median)`
          }
        />
        <Fact
          label="Returned within"
          value={
            [
              detail.returnedWithin.day ? "a day" : null,
              detail.returnedWithin.week ? "a week" : null,
              detail.returnedWithin.month ? "a month" : null,
            ]
              .filter(Boolean)
              .join(", ") || "Not yet"
          }
        />
      </dl>
      <div className="flex flex-wrap gap-2 text-xs">
        <span
          className={`rating ${detail.bot.verdict === "bot" ? "rating-poor" : detail.bot.verdict === "suspect" ? "rating-needs-improvement" : "rating-good"}`}
        >
          {detail.bot.verdict} · score {detail.bot.score}
        </span>
        {fired.map(([signal]) => (
          <span key={signal} className="rating rating-none">
            {signalLabels[signal as keyof typeof signalLabels]}
          </span>
        ))}
        {detail.isInternal ? <span className="rating rating-none">internal traffic</span> : null}
        {Object.entries(detail.experiments).map(([name, variant]) => (
          <span key={name} className="rating rating-none">
            {name}: {variant}
          </span>
        ))}
      </div>
      {detail.identity ? (
        <div className="grid gap-1 text-xs">
          <p>
            <span className="text-muted">Identified as </span>
            <span className="font-mono">{detail.identity.userId}</span>
          </p>
          {formatProps(detail.identity.traits).length > 0 ? (
            <p className="font-mono text-muted">
              {formatProps(detail.identity.traits).join(" · ")}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="grid content-start gap-2">
          <h3 className="text-sm font-semibold">Top pages</h3>
          {detail.topPages.length === 0 ? (
            <p className="text-sm text-muted">No pageviews</p>
          ) : (
            <ul className="grid gap-0.5">
              {detail.topPages.map((page) => (
                <li key={page.value} className="top-row">
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">{page.value}</span>
                  <span className="tabular-nums">{formatMetric(page.pageviews, "count")}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="grid content-start gap-2">
          <h3 className="text-sm font-semibold">Recent sessions</h3>
          {detail.recentSessions.length === 0 ? (
            <p className="text-sm text-muted">No sessions</p>
          ) : (
            <ul className="grid gap-0.5">
              {detail.recentSessions.map((session) => (
                <li key={session.id}>
                  <Link
                    href={sessionHref(session.id)}
                    className="top-row top-row-link"
                    prefetch={false}
                  >
                    <span className="min-w-0 flex-1 truncate font-mono text-xs">
                      {session.entryPage}
                      {session.exitPage !== session.entryPage ? ` › ${session.exitPage}` : ""}
                    </span>
                    <span className="text-xs text-muted">{formatRelative(session.startedAt)}</span>
                    <span className="tabular-nums text-xs">
                      {formatDuration(session.durationMs)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

const visitLimit = 20;

export async function VisitList({ scope, visitor, sessionHref }: Props) {
  const read = await scope.visitorVisits(visitor, { limit: visitLimit });
  if (!read.ok) return <ReadNotice error={read.error} what="this visitor's visits" />;
  const visits = read.value.data;
  return (
    <section className="panel-section grid gap-4">
      <header className="grid gap-1">
        <h2 className="text-base font-semibold">Visits</h2>
        <p className="text-sm text-muted">
          Each visit with its pages in order and what the visitor did. Open a visit for the full
          trail.
        </p>
      </header>
      {visits.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">No visits stored for this visitor.</p>
      ) : (
        <ol className="grid gap-3">
          {visits.map((visit) => (
            <li key={visit.sessionId} className="card grid gap-3 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <Link
                    href={sessionHref(visit.sessionId)}
                    className="font-medium text-fg hover:underline"
                    prefetch={false}
                  >
                    Visit {visit.visitNumber}
                  </Link>
                  <span className="text-muted">{formatDateTime(visit.startedAt)} UTC</span>
                  <span className="text-muted">
                    {formatDuration(Date.parse(visit.endedAt) - Date.parse(visit.startedAt))}
                  </span>
                </span>
                <span className="flex flex-wrap gap-x-3 text-muted">
                  <span>
                    {visit.source.channel}
                    {visit.source.referrerDomain ? ` · ${visit.source.referrerDomain}` : ""}
                    {visit.source.utm.source ? ` · utm ${visit.source.utm.source}` : ""}
                  </span>
                  {visit.sincePreviousVisitMs !== null ? (
                    <span>
                      {formatDuration(visit.sincePreviousVisitMs)} after the previous visit
                    </span>
                  ) : (
                    <span>first visit</span>
                  )}
                </span>
              </div>
              <ol className="grid gap-1 text-xs">
                {visit.pages.map((page, index) => (
                  <li key={`${index} ${page.at}`} className="flex flex-wrap items-baseline gap-x-3">
                    <span className="font-mono text-muted">
                      {formatDateTime(page.at).slice(-5)}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-mono">{page.path}</span>
                    <span className="text-muted">
                      {page.timeOnPageMs > 0 ? formatDuration(page.timeOnPageMs) : "exit"}
                      {page.scrollDepth !== null
                        ? ` · ${Math.round(page.scrollDepth * 100)}% scrolled`
                        : ""}
                    </span>
                  </li>
                ))}
              </ol>
              {visit.actions.length > 0 ? (
                <ul className="flex flex-wrap gap-2 text-xs">
                  {visit.actions.map((action, index) => (
                    <li key={`${index} ${action.at}`} className="chip">
                      <span className="font-medium">{action.name}</span>
                      {formatProps(action.props).length > 0 ? (
                        <span className="text-muted">{formatProps(action.props).join(", ")}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      )}
      {read.value.nextCursor ? (
        <p className="text-xs text-muted">Showing the latest {visits.length} visits.</p>
      ) : null}
    </section>
  );
}
