"use client";

import { createClient } from "@spoar/client";
import type { LiveEvent } from "@spoar/contract";
import { useEffect, useMemo, useState } from "react";

import { countryName } from "@/lib/format";

type Props = {
  endpoint: string;
  project: string;
};

type Live = {
  online: number;
  latest: LiveEvent | null;
};

const pollMs = 10_000;

function useLive(endpoint: string, project: string) {
  const scope = useMemo(() => createClient({ endpoint }).project(project), [endpoint, project]);
  const [live, setLive] = useState<Live>({ online: 0, latest: null });

  useEffect(() => {
    let active = true;
    async function poll() {
      const [now, events] = await Promise.all([
        scope.realtime(),
        scope.realtimeEvents({ limit: 1 }),
      ]);
      if (!active) return;
      setLive((previous) => ({
        online: now.ok ? now.value.data.visitors : previous.online,
        latest: events.ok ? (events.value.data[0] ?? previous.latest) : previous.latest,
      }));
    }
    void poll();
    const timer = window.setInterval(() => void poll(), pollMs);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [scope]);

  return live;
}

function describe(event: LiveEvent) {
  const where = event.country ? countryName(event.country) : "somewhere";
  const what = event.name === "pageview" ? "Pageview" : event.name;
  return { title: `${what} from ${where}`, detail: [event.path, event.device].filter(Boolean) };
}

export function LiveFeed({ endpoint, project }: Props) {
  const live = useLive(endpoint, project);
  const latest = live.latest ? describe(live.latest) : null;
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
      {latest && live.latest ? (
        <div
          key={live.latest.id}
          className="toast-in absolute top-16 right-4 z-10 flex items-center gap-2.5 rounded-xl border border-line bg-surface/95 py-2 pr-3.5 pl-2.5 text-left shadow-[0_14px_30px_-14px_rgb(60_30_10/0.45)] backdrop-blur"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-accent/12 font-mono text-[0.6rem] font-medium text-accent">
            {live.latest.country ?? "··"}
          </span>
          <span className="flex flex-col">
            <span className="text-[0.68rem] font-medium text-fg">{latest.title}</span>
            <span className="font-mono text-[0.6rem] text-muted">{latest.detail.join(" · ")}</span>
          </span>
        </div>
      ) : null}
    </>
  );
}
