"use client";

import { createClient } from "@spoar/client";
import type { LiveEvent } from "@spoar/contract";
import { useAnalytics } from "@spoar/sdk/react";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import { countryName } from "@/lib/format";

type Props = {
  endpoint: string;
  project: string;
  onFresh?: () => void;
};

type Sent = { path: string; ts: number; visitor: string };

type Shown = { event: LiveEvent; mine: boolean };

const pollMs = 10_000;
const toastMs = 3400;
const ownToastMs = 7000;
const gapMs = 600;
const batch = 5;
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
        setSent((previous) => {
          if (previous) return previous;
          return {
            path: pageview.page.path,
            ts: new Date(pageview.ts).getTime(),
            visitor: pageview.visitor,
          };
        });
      }),
    [analytics],
  );
  return sent;
}

function useLive(endpoint: string, project: string, onFresh?: () => void) {
  const scope = useMemo(() => createClient({ endpoint }).project(project), [endpoint, project]);
  const sent = useOwnPageview();
  const seen = useRef(new Set<string>());
  const matched = useRef(false);
  const primed = useRef(false);
  const notify = useEffectEvent(() => onFresh?.());
  const [online, setOnline] = useState(0);
  const [queue, setQueue] = useState<Shown[]>([]);
  const [current, setCurrent] = useState<Shown | null>(null);

  useEffect(() => {
    let active = true;
    async function poll() {
      const [now, events] = await Promise.all([
        scope.realtime(),
        scope.realtimeEvents({ limit: batch }),
      ]);
      if (!active) return;
      if (now.ok) setOnline(now.value.data.visitors);
      if (!events.ok) return;
      const fresh = events.value.data.filter((event) => !seen.current.has(event.id)).reverse();
      for (const event of fresh) seen.current.add(event.id);
      const shown = fresh.map((event) => {
        const mine = !matched.current && isMine(event, sent);
        if (mine) matched.current = true;
        return { event, mine };
      });
      if (shown.length > 0) setQueue((previous) => [...previous, ...shown]);
      if (shown.length > 0 && primed.current) notify();
      primed.current = true;
    }
    void poll();
    const timer = window.setInterval(() => void poll(), pollMs);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [scope, sent]);

  useEffect(() => {
    if (current) {
      const shownMs = current.mine ? ownToastMs : toastMs;
      const timer = window.setTimeout(() => setCurrent(null), shownMs + gapMs);
      return () => window.clearTimeout(timer);
    }
    if (queue.length === 0) return;
    const next = queue.find((item) => item.mine) ?? queue[0] ?? null;
    setCurrent(next);
    setQueue((previous) => previous.filter((item) => item !== next));
  }, [current, queue]);

  return { online, current };
}

function describe({ event, mine }: Shown) {
  const where = event.country ? countryName(event.country) : "somewhere";
  if (mine) return { title: "That was you", detail: [where, event.device] };
  const what = event.name === "pageview" ? "Pageview" : event.name;
  return { title: `${what} from ${where}`, detail: [event.path, event.device].filter(Boolean) };
}

export function LiveFeed({ endpoint, project, onFresh }: Props) {
  const live = useLive(endpoint, project, onFresh);
  const latest = live.current ? describe(live.current) : null;
  return (
    <>
      <span className="flex items-center gap-2">
        <span className="animate-live size-1.5 rounded-full bg-accent" />
        <span className="text-[0.72rem] text-fg">
          <span key={live.online} className="tick-in inline-block tabular-nums">
            {live.online}
          </span>{" "}
          {live.online === 1 ? "visitor" : "visitors"} in the last five minutes
        </span>
      </span>
      {latest && live.current ? (
        <div
          key={live.current.event.id}
          style={{ animationDuration: `${live.current.mine ? ownToastMs : toastMs}ms` }}
          className={`toast-in absolute top-16 right-4 z-10 flex items-center gap-2.5 rounded-xl border bg-surface/95 py-2 pr-3.5 pl-2.5 text-left shadow-[0_14px_30px_-14px_rgb(var(--shade)/0.45)] backdrop-blur ${live.current.mine ? "border-accent/50" : "border-line"}`}
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-accent/12 font-mono text-[0.6rem] font-medium text-accent">
            {live.current.event.country ?? "··"}
          </span>
          <span className="flex flex-col">
            <span className="text-[0.68rem] font-medium text-fg">{latest.title}</span>
            <span className="font-mono text-[0.6rem] text-muted">
              {latest.detail.join(" · ")}
              {live.current.mine ? ", stored a moment ago" : null}
            </span>
          </span>
        </div>
      ) : null}
    </>
  );
}
