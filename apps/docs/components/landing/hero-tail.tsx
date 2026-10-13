"use client";

import { createClient } from "@spoar/client";
import type { BreakdownRow, LiveEvent } from "@spoar/contract";
import { useAnalytics } from "@spoar/sdk/react";
import { useEffect, useMemo, useState } from "react";

import { countryName, formatCount } from "@/lib/format";

type Props = {
  endpoint: string;
  project: string;
  top: BreakdownRow | undefined;
};

type Sent = { path: string; ts: number; visitor: string };

const pollMs = 10_000;
const kept = 5;
const clockSlackMs = 15_000;

function isMine(event: LiveEvent, sent: Sent | null) {
  if (!sent || event.name !== "pageview" || event.path !== sent.path) return false;
  if (event.visitor !== undefined) return event.visitor === sent.visitor;
  return Math.abs(new Date(event.ts).getTime() - sent.ts) < clockSlackMs;
}

function useOwnPageview() {
  const analytics = useAnalytics();
  const [sent, setSent] = useState<Sent | null>(null);
  useEffect(
    () =>
      analytics.on("send", (envelope) => {
        const pageview = envelope.events.find((event) => event.name === "pageview");
        if (!pageview) return;
        setSent(
          (previous) =>
            previous ?? {
              path: pageview.page.path,
              ts: new Date(pageview.ts).getTime(),
              visitor: pageview.visitor,
            },
        );
      }),
    [analytics],
  );
  return sent;
}

function useTail(endpoint: string, project: string) {
  const scope = useMemo(() => createClient({ endpoint }).project(project), [endpoint, project]);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [online, setOnline] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    async function poll() {
      const [now, latest] = await Promise.all([
        scope.realtime(),
        scope.realtimeEvents({ limit: kept }),
      ]);
      if (!active) return;
      if (now.ok) setOnline(now.value.data.visitors);
      if (latest.ok) setEvents([...latest.value.data].reverse());
    }
    void poll();
    const timer = window.setInterval(() => void poll(), pollMs);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [scope]);

  return { events, online };
}

function clock(ts: string) {
  return `${new Date(ts).toISOString().slice(11, 19)} UTC`;
}

function line(event: LiveEvent) {
  const where = event.country ? countryName(event.country) : "somewhere";
  return [event.name, event.path, where, event.device].filter(Boolean).join(" · ");
}

export function HeroTail({ endpoint, project, top }: Props) {
  const { events, online } = useTail(endpoint, project);
  const sent = useOwnPageview();
  return (
    <>
      <div className="console-tail-body flex min-h-0 flex-1 flex-col justify-end gap-3 overflow-hidden px-4 pb-3">
        <p className="text-[var(--console-muted)]">$ spoar tail {project}</p>
        {events.length === 0 ? (
          <p className="text-[var(--console-muted)]">Waiting for the next event...</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="tick-in">
              <p className="font-medium text-[var(--console-fg)]">{clock(event.ts)}</p>
              <p className="truncate text-[var(--console-dim)]">
                └ {line(event)}
                {isMine(event, sent) ? (
                  <span className="text-[var(--console-string)]"> ← that was you</span>
                ) : null}
              </p>
            </div>
          ))
        )}
        {top ? (
          <div>
            <p className="font-medium text-[var(--console-fg)]">Top page, last 30 days:</p>
            <p className="text-[var(--console-dim)]">
              {top.value} with {formatCount(top.visitors ?? 0)} visitors.
            </p>
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-1 border-t border-[var(--console-line)] px-4 py-2.5">
        <span className="text-[var(--console-dim)]">&gt;</span>
        <span className="console-caret h-3.5 w-[7px] bg-[var(--console-fg)]" />
      </div>
      <p className="border-t border-[var(--console-line)] px-4 py-2.5 text-[var(--console-muted)]">
        @spoar/client connected
        {online === null ? null : ` • ${online} ${online === 1 ? "visitor" : "visitors"} online`}
      </p>
    </>
  );
}
