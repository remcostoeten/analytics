"use client";

import type { ActiveVisitor, LiveEvent, LiveSession } from "@spoar/contract";
import Link from "next/link";
import { useEffect, useState } from "react";

import { readRealtime } from "../actions";
import {
  formatDimensionValue,
  formatDuration,
  formatMetric,
  formatRelative,
  formatTime,
} from "../format";
import { feedKeep, mergeEvents, needsSignIn, realtimeIntervalMs } from "../realtime";
import type { RealtimeSnapshot } from "../realtime";

type Props = {
  project: string;
  initial: RealtimeSnapshot;
  detailHref: (visitor: string) => string;
  sessionHref: (session: string) => string;
  canFollow: boolean;
};

type CardProps = { label: string; value: string; hint: string };

function Card({ label, value, hint }: CardProps) {
  return (
    <div className="metric-card metric-static">
      <span className="metric-label text-sm">{label}</span>
      <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
      <span className="text-xs text-muted">{hint}</span>
    </div>
  );
}

function botTone(score: number) {
  if (score >= 50) return "rating rating-poor";
  return score >= 25 ? "rating rating-needs-improvement" : "rating rating-good";
}

function DetailNote({ what }: { what: string }) {
  return (
    <p className="py-6 text-center text-sm text-muted">
      <Link href="/sign-in" className="text-link underline">
        Sign in
      </Link>{" "}
      to see {what}.
    </p>
  );
}

type FeedProps = { events: LiveEvent[] };

function Feed({ events }: FeedProps) {
  if (events.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted">No events yet. New ones appear here.</p>
    );
  }
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Event</th>
            <th scope="col">Path</th>
            <th scope="col">Country</th>
            <th scope="col">Device</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id}>
              <td className="font-mono text-xs text-muted">{formatTime(event.ts)}</td>
              <td className="font-medium">{event.name}</td>
              <td className="max-w-[32ch] truncate font-mono text-xs">{event.path ?? "–"}</td>
              <td className="text-xs">
                {event.country ? formatDimensionValue("country", event.country) : "–"}
              </td>
              <td className="text-xs text-muted">{event.device}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type VisitorsProps = {
  visitors: ActiveVisitor[];
  hrefFor: Props["detailHref"];
  canFollow: boolean;
};

function Visitors({ visitors, hrefFor, canFollow }: VisitorsProps) {
  if (visitors.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted">Nobody active in the last five minutes.</p>
    );
  }
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Visitor</th>
            <th scope="col">Current page</th>
            <th scope="col">Place</th>
            <th scope="col">Device</th>
            <th scope="col" className="text-right">
              Pages
            </th>
            <th scope="col" className="text-right">
              Duration
            </th>
            <th scope="col">Bot score</th>
          </tr>
        </thead>
        <tbody>
          {visitors.map((row) => (
            <tr key={row.visitor}>
              <td className="font-mono text-xs">
                {canFollow ? (
                  <Link href={hrefFor(row.visitor)} className="hover:underline" prefetch={false}>
                    {row.visitor.slice(0, 8)}
                  </Link>
                ) : (
                  row.visitor.slice(0, 8)
                )}
                {row.identified ? <span className="ml-1 text-muted">identified</span> : null}
              </td>
              <td className="max-w-[28ch] truncate font-mono text-xs">{row.path ?? "–"}</td>
              <td className="text-xs">
                {[row.city, row.country ? formatDimensionValue("country", row.country) : null]
                  .filter(Boolean)
                  .join(", ") || "–"}
              </td>
              <td className="text-xs text-muted">
                {[row.browser, row.os].filter(Boolean).join(" on ") || row.device}
              </td>
              <td className="text-right tabular-nums">{row.pages}</td>
              <td className="text-right tabular-nums">{formatDuration(row.duration * 1000)}</td>
              <td>
                <span className={botTone(row.botScore)}>{row.botScore}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type SessionsProps = { sessions: LiveSession[]; hrefFor: Props["sessionHref"]; canFollow: boolean };

function Sessions({ sessions, hrefFor, canFollow }: SessionsProps) {
  if (sessions.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted">
        No session had an event in the last five minutes.
      </p>
    );
  }
  return (
    <ul className="grid gap-2">
      {sessions.map((session) => (
        <li key={session.id} className="card grid gap-2 p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex flex-wrap items-center gap-2">
              {canFollow ? (
                <Link
                  href={hrefFor(session.id)}
                  className="font-mono hover:underline"
                  prefetch={false}
                >
                  {session.id.slice(0, 8)}
                </Link>
              ) : (
                <span className="font-mono">{session.id.slice(0, 8)}</span>
              )}
              <span
                className={`rating ${session.signal === "bot" ? "rating-poor" : session.signal === "suspect" ? "rating-needs-improvement" : "rating-good"}`}
              >
                {session.signal}
              </span>
              <span className="text-muted">
                {session.country ? formatDimensionValue("country", session.country) : "Unknown"} ·{" "}
                {session.device}
              </span>
            </span>
            <span className="text-muted">
              {session.pages} pages · {formatDuration(session.durationMs)} · last seen{" "}
              {formatRelative(session.lastSeen)}
            </span>
          </div>
          <ol className="flex flex-wrap gap-x-1.5 gap-y-1 font-mono">
            {session.trail.map((path, index) => (
              <li key={`${index} ${path}`} className="flex items-center gap-1.5">
                {index > 0 ? <span className="text-muted">›</span> : null}
                <span>{path}</span>
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ul>
  );
}

export function RealtimePanel({ project, initial, detailHref, sessionHref, canFollow }: Props) {
  const [snapshot, setSnapshot] = useState(initial);
  const [events, setEvents] = useState<LiveEvent[]>(
    initial.events.ok ? initial.events.value.data : [],
  );
  const [secondsLeft, setSecondsLeft] = useState(realtimeIntervalMs / 1000);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    function onVisibility() {
      setPaused(document.visibilityState === "hidden");
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (paused) return;
    const tick = setInterval(() => setSecondsLeft((left) => Math.max(0, left - 1)), 1000);
    return () => clearInterval(tick);
  }, [paused]);

  useEffect(() => {
    if (paused || secondsLeft > 0) return;
    let active = true;
    async function poll() {
      const next = await readRealtime(project);
      if (!active) return;
      setSnapshot(next);
      if (next.events.ok) {
        const polled = next.events.value.data;
        setEvents((shown) => mergeEvents(shown, polled, feedKeep));
      }
      setSecondsLeft(realtimeIntervalMs / 1000);
    }
    void poll();
    return () => {
      active = false;
    };
  }, [project, paused, secondsLeft]);

  const summary = snapshot.summary.ok ? snapshot.summary.value.data : null;
  const visitors = snapshot.visitors.ok ? snapshot.visitors.value.data : null;
  const sessions = snapshot.sessions.ok ? snapshot.sessions.value.data : null;

  return (
    <div className="mx-auto grid max-w-[1200px] items-start gap-6 lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="grid gap-2">
        <Card
          label="Visitors now"
          value={summary ? formatMetric(summary.visitors, "count") : "–"}
          hint="Unique human visitors in the last five minutes"
        />
        <Card
          label="Pageviews per minute"
          value={summary ? summary.pageviewsPerMinute.toFixed(1) : "–"}
          hint="Over the last five minutes"
        />
        <Card
          label="Active sessions"
          value={sessions ? formatMetric(sessions.length, "count") : "–"}
          hint={sessions ? "Sessions with an event in the last five minutes" : "Needs sign-in"}
        />
        <p className="px-1 text-xs text-muted" aria-live="polite">
          {paused
            ? "Paused while the tab is hidden"
            : `Updated ${formatRelative(snapshot.at)} · next in ${secondsLeft}s`}
        </p>
      </aside>

      <div className="panel">
        <section className="panel-section grid gap-4">
          <header className="grid gap-1">
            <h2 className="text-base font-semibold">Live events</h2>
            <p className="text-sm text-muted">
              Every event as it arrives, newest first. The feed keeps the last {feedKeep}.
            </p>
          </header>
          {!snapshot.events.ok ? (
            <p className="text-sm text-err">
              Could not read live events: {snapshot.events.error.message}
            </p>
          ) : (
            <Feed events={events} />
          )}
        </section>

        <section className="panel-section grid gap-4">
          <h2 className="text-base font-semibold">Right now</h2>
          {!snapshot.summary.ok ? (
            <p className="text-sm text-err">
              Could not read the summary: {snapshot.summary.error.message}
            </p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="grid content-start gap-2">
                <h3 className="text-sm font-semibold">Top pages</h3>
                {summary && summary.pages.length > 0 ? (
                  <ul className="grid gap-0.5">
                    {summary.pages.map((row) => (
                      <li key={row.value} className="top-row">
                        <span className="min-w-0 flex-1 truncate font-mono text-xs">
                          {row.value}
                        </span>
                        <span className="tabular-nums">{row.visitors}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-2 text-sm text-muted">No pageviews in the last five minutes</p>
                )}
              </div>
              <div className="grid content-start gap-2">
                <h3 className="text-sm font-semibold">Top countries</h3>
                {summary && summary.countries.length > 0 ? (
                  <ul className="grid gap-0.5">
                    {summary.countries.map((row) => (
                      <li key={row.value} className="top-row">
                        <span className="min-w-0 flex-1 truncate">
                          {formatDimensionValue("country", row.value)}
                        </span>
                        <span className="tabular-nums">{row.visitors}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-2 text-sm text-muted">No visitors in the last five minutes</p>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="panel-section grid gap-4">
          <header className="grid gap-1">
            <h2 className="text-base font-semibold">Active visitors</h2>
            <p className="text-sm text-muted">Who is on the site now, newest activity first.</p>
          </header>
          {visitors ? (
            <Visitors visitors={visitors} hrefFor={detailHref} canFollow={canFollow} />
          ) : needsSignIn(snapshot.visitors) ? (
            <DetailNote what="active visitors" />
          ) : (
            <p className="text-sm text-err">
              Could not read visitors:{" "}
              {!snapshot.visitors.ok ? snapshot.visitors.error.message : ""}
            </p>
          )}
        </section>

        <section className="panel-section grid gap-4">
          <header className="grid gap-1">
            <h2 className="text-base font-semibold">Active sessions</h2>
            <p className="text-sm text-muted">
              The pages each live session walked through, in order.
            </p>
          </header>
          {sessions ? (
            <Sessions sessions={sessions} hrefFor={sessionHref} canFollow={canFollow} />
          ) : needsSignIn(snapshot.sessions) ? (
            <DetailNote what="active sessions" />
          ) : (
            <p className="text-sm text-err">
              Could not read sessions:{" "}
              {!snapshot.sessions.ok ? snapshot.sessions.error.message : ""}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
