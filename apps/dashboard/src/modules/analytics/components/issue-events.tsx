import type { ProjectScope } from "@spoar/client";
import type { IssueEvent } from "@spoar/contract";
import type { IssueID } from "@spoar/shared/semantic";

import { ReadNotice } from "@/modules/session/components/read-notice";

import { formatDateTime, formatTime } from "../format";
import { frameLocation } from "../issues";

type Props = { scope: ProjectScope; issue: IssueID };

const eventLimit = 20;

function Stack({ event }: { event: IssueEvent }) {
  if (event.error.stack.length === 0) {
    return <p className="text-xs text-muted">No stack frames were sent.</p>;
  }
  return (
    <ol className="grid gap-0.5 font-mono text-[11px]">
      {event.error.stack.map((frame, index) => (
        <li
          key={`${index} ${frame.file} ${frame.line} ${frame.column}`}
          className={frame.inApp ? "text-fg" : "text-muted"}
        >
          <span className="text-muted">at </span>
          {frame.function ?? "<anonymous>"}
          <span className="text-muted"> ({frameLocation(frame)})</span>
        </li>
      ))}
    </ol>
  );
}

function Breadcrumbs({ event }: { event: IssueEvent }) {
  if (event.breadcrumbs.length === 0) return null;
  return (
    <ol className="grid gap-0.5 text-xs">
      {event.breadcrumbs.map((crumb, index) => (
        <li key={`${index} ${crumb.ts}`} className="flex gap-2">
          <span className="font-mono text-muted">{formatTime(crumb.ts)}</span>
          <span className="w-20 shrink-0 text-muted">{crumb.kind}</span>
          <span className="min-w-0 truncate">{crumb.message}</span>
        </li>
      ))}
    </ol>
  );
}

export async function IssueEvents({ scope, issue }: Props) {
  const read = await scope.issueEvents(issue, { limit: eventLimit });
  if (!read.ok) return <ReadNotice error={read.error} what="this issue's events" />;
  const events = read.value.data;
  return (
    <section className="panel-section grid gap-4">
      <header className="grid gap-1">
        <h2 className="text-base font-semibold">Latest events</h2>
        <p className="text-sm text-muted">
          The most recent stored occurrences with their stack and what happened before them.
        </p>
      </header>
      {events.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">No stored events for this issue.</p>
      ) : (
        <ul className="grid gap-3">
          {events.map((event) => (
            <li key={event.id} className="card grid gap-3 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                <span className="flex flex-wrap gap-x-3 gap-y-1">
                  <span className="font-medium text-fg">{formatDateTime(event.ts)} UTC</span>
                  <span className="font-mono text-muted">{event.page.path}</span>
                </span>
                <span className="flex flex-wrap gap-x-3 text-muted">
                  {event.release ? <span>release {event.release}</span> : null}
                  {event.environment ? <span>{event.environment}</span> : null}
                  <span>
                    {[event.device.browser, event.device.os].filter(Boolean).join(" on ") ||
                      event.device.type}
                  </span>
                  <span title="Anonymous visitor id" className="font-mono">
                    {event.visitor.slice(0, 8)}
                  </span>
                </span>
              </div>
              <p className="text-sm">
                <span className="font-medium">{event.error.type}</span>
                {event.error.message ? `: ${event.error.message}` : ""}
              </p>
              <Stack event={event} />
              <Breadcrumbs event={event} />
            </li>
          ))}
        </ul>
      )}
      {read.value.nextCursor ? (
        <p className="text-xs text-muted">Showing the latest {events.length} events.</p>
      ) : null}
    </section>
  );
}
