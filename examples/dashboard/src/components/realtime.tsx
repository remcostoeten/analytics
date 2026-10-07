import type { ProjectScope } from "@spoar/client";
import type { LiveEvent } from "@spoar/contract";
import { useEffect, useState } from "react";

import { countryName, formatTime } from "../format";
import { useRead } from "../use-read";
import { ReadFrame } from "./read-frame";

type Props = { scope: ProjectScope; scopeKey: string };

const streamLimit = 30;
const refreshMs = 30_000;

function useLiveEvents(scope: ProjectScope, scopeKey: string) {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setEvents([]);
    setProblem(null);
    async function follow() {
      const latest = await scope.realtimeEvents({ limit: streamLimit });
      if (controller.signal.aborted) return;
      if (!latest.ok) {
        setProblem(`${latest.error.code}: ${latest.error.message}`);
        return;
      }
      setEvents([...latest.value.data].reverse());
      const after = latest.value.nextCursor;
      for await (const result of scope.liveEvents({ after, signal: controller.signal })) {
        if (controller.signal.aborted) return;
        if (!result.ok) {
          if (result.error.code !== "ABORTED")
            setProblem(`${result.error.code}: ${result.error.message}`);
          return;
        }
        setEvents((previous) => [result.value, ...previous].slice(0, streamLimit));
      }
    }
    void follow();
    return () => controller.abort();
  }, [scopeKey]);

  return { events, problem };
}

export function Realtime({ scope, scopeKey }: Props) {
  const [tick, setTick] = useState(0);
  const now = useRead(() => scope.realtime(), [scopeKey, tick]);
  const live = useLiveEvents(scope, scopeKey);

  useEffect(() => {
    const timer = setInterval(() => setTick((count) => count + 1), refreshMs);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="realtime">
      <ReadFrame
        title="Right now"
        read={now}
        isEmpty={() => false}
        empty=""
        skeleton={<div className="live-count skeleton">0</div>}
      >
        {(value) => (
          <div className="live-count">
            <strong>{value.data.visitors}</strong>
            <span>
              {value.data.visitors === 1 ? "visitor" : "visitors"} in the last five minutes,{" "}
              {value.data.pageviewsPerMinute} pageviews a minute
            </span>
          </div>
        )}
      </ReadFrame>
      <section className="card">
        <header className="card-head">
          <h2>Latest events</h2>
          <span className="pulse" aria-hidden="true" />
        </header>
        {live.problem ? <p className="failure-inline">{live.problem}</p> : null}
        {live.events.length === 0 && !live.problem ? (
          <p className="empty">
            Waiting for the next event. Open the site in another tab to see one arrive.
          </p>
        ) : null}
        {live.events.length > 0 ? (
          <ol className="stream">
            {live.events.map((event) => (
              <li key={event.id}>
                <time dateTime={event.ts}>{formatTime(event.ts)}</time>
                <code>{event.name}</code>
                <span className="path">{event.path ?? ""}</span>
                <span className="where">
                  {event.country ? countryName(event.country) : ""}
                  {event.device !== "unknown" ? `, ${event.device}` : ""}
                </span>
              </li>
            ))}
          </ol>
        ) : null}
      </section>
    </div>
  );
}
