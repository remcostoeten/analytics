"use client";

import { useState } from "react";

import { activityFeed } from "../content";
import { useInterval } from "../hooks/use-interval";

export function ActivityTicker() {
  const [index, setIndex] = useState(0);
  useInterval(() => setIndex((value) => (value + 1) % activityFeed.length), 3000);
  const current = activityFeed[index] ?? activityFeed[0]!;
  return (
    <div className="flex items-center gap-3 border-l border-ember/60 pl-4">
      <span className="blink size-1.5 rounded-full bg-ember" />
      <p key={current.id} className="mono animate-[row-in_500ms_ease-out] text-[11px] text-fog">
        <span className="text-mist">{current.id}</span>
        <span className="mx-2 text-line-strong">·</span>
        {current.event}
        <span className="mx-2 text-line-strong">·</span>
        <span className="text-fog/70">{current.when}</span>
      </p>
    </div>
  );
}
