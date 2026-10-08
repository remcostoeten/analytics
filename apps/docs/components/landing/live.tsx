"use client";

import { useEffect, useState } from "react";

const visits = [
  { place: "Amsterdam", path: "/pricing", device: "Desktop" },
  { place: "Berlin", path: "/docs/sdk/install", device: "Mobile" },
  { place: "Toronto", path: "/", device: "Desktop" },
  { place: "Lisbon", path: "/blog/launch", device: "Tablet" },
  { place: "Tokyo", path: "/changelog", device: "Mobile" },
];

const counts = [23, 24, 26, 25, 27, 24];

function useTick(interval: number, length: number) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % length), interval);
    return () => window.clearInterval(timer);
  }, [interval, length]);
  return index;
}

export function LiveCount() {
  const index = useTick(2600, counts.length);
  return (
    <span key={counts[index]} className="tick-in inline-block tabular-nums">
      {counts[index]}
    </span>
  );
}

export function LiveToast() {
  const index = useTick(3400, visits.length);
  const visit = visits[index];
  return (
    <div
      key={index}
      className="toast-in absolute top-16 right-4 z-10 flex items-center gap-2.5 rounded-xl border border-line bg-surface/95 py-2 pr-3.5 pl-2.5 shadow-[0_14px_30px_-14px_rgb(60_30_10/0.45)] backdrop-blur"
    >
      <span className="flex size-7 items-center justify-center rounded-lg bg-accent/12 font-mono text-[0.6rem] font-medium text-accent">
        {visit.place.slice(0, 2).toUpperCase()}
      </span>
      <span className="flex flex-col text-left">
        <span className="text-[0.68rem] font-medium text-fg">New visitor from {visit.place}</span>
        <span className="font-mono text-[0.6rem] text-muted">
          {visit.path} · {visit.device}
        </span>
      </span>
    </div>
  );
}
