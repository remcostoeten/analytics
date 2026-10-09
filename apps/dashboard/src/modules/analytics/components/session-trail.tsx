import type { SessionEvents } from "@spoar/contract";

import { formatDuration, formatTime } from "../format";
import { countSteps, formatProps, trailSteps } from "../trail";

type Props = { events: SessionEvents };

export function SessionTrail({ events }: Props) {
  const steps = trailSteps(events.data);
  const counts = countSteps(steps);
  return (
    <section className="panel-section grid gap-4">
      <header className="grid gap-1">
        <h2 className="text-base font-semibold">Trail</h2>
        <p className="text-sm text-muted">
          {counts.pageviews} pageviews and {counts.events} events over{" "}
          {formatDuration(events.session.durationMs)}, oldest first.
        </p>
      </header>
      {steps.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">This session has no stored events.</p>
      ) : (
        <ol className="timeline">
          {steps.map((step) => (
            <li key={step.id} className={`timeline-step timeline-${step.kind}`}>
              <span className="timeline-time font-mono text-xs text-muted" title={step.ts}>
                {formatTime(step.ts)}
                <span className="block text-[10px]">+{formatDuration(step.offsetMs)}</span>
              </span>
              <span className="timeline-dot" aria-hidden="true" />
              <span className="grid min-w-0 gap-0.5">
                <span className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  {step.kind === "pageview" ? (
                    <span className="font-mono">{step.path}</span>
                  ) : (
                    <>
                      <span className="font-medium">{step.name}</span>
                      <span className="font-mono text-xs text-muted">{step.path}</span>
                    </>
                  )}
                </span>
                {step.kind === "pageview" ? (
                  <span className="text-xs text-muted">
                    {step.title ? `${step.title} · ` : ""}
                    {step.dwellMs === null
                      ? "last page"
                      : `${formatDuration(step.dwellMs)} on page`}
                  </span>
                ) : formatProps(step.props).length > 0 ? (
                  <span className="font-mono text-xs text-muted">
                    {formatProps(step.props).join(" · ")}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ol>
      )}
      {events.nextCursor ? (
        <p className="text-xs text-muted">Showing the first {events.data.length} events.</p>
      ) : null}
    </section>
  );
}
