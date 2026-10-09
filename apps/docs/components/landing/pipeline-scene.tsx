"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentType, CSSProperties, ReactNode, SVGProps } from "react";

import { CheckIcon, DatabaseIcon, RouteIcon, ShieldIcon, SparkIcon } from "./icons";
import { Scene, Sticker } from "./scene";

type Hop = 0 | 1 | 2 | 3;

type Station = {
  hop: Hop;
  label: string;
  detail: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

type Line = {
  hop: Hop;
  tag: string;
  text: ReactNode;
};

type HopStyle = CSSProperties & { "--hop": number };

type LineStyle = CSSProperties & { "--i": number };

const stations: Station[] = [
  { hop: 0, label: "Browser", detail: "7 events, 1 fetch", icon: SparkIcon },
  { hop: 1, label: "/_ra", detail: "adds the key", icon: RouteIcon },
  { hop: 2, label: "API", detail: "checks, enriches", icon: ShieldIcon },
  { hop: 3, label: "Postgres", detail: "1 row, 38 ms", icon: DatabaseIcon },
];

const lines: Line[] = [
  {
    hop: 0,
    tag: "sdk",
    text: (
      <>
        <span className="text-[#ffb59a]">pageview</span> /pricing
      </>
    ),
  },
  { hop: 0, tag: "sdk", text: "visitor v_8f2c · session s_a81e" },
  { hop: 1, tag: "proxy", text: "+ secret key · + forwarded ip" },
  {
    hop: 2,
    tag: "api",
    text: (
      <>
        key <span className="text-ok">ok</span> · origin <span className="text-ok">ok</span> · bot
        0.02
      </>
    ),
  },
  { hop: 2, tag: "api", text: "NL · desktop · organic" },
  { hop: 2, tag: "api", text: "ip hashed with the daily salt, then dropped" },
  {
    hop: 3,
    tag: "db",
    text: (
      <>
        <span className="text-[#c4a4ef]">INSERT INTO</span> events · 1 row
      </>
    ),
  },
];

const card =
  "rounded-xl border border-[var(--glass-edge)] bg-surface/90 shadow-[0_14px_30px_-16px_rgb(var(--shade)/0.45)] backdrop-blur-sm";

const dwellMs: Record<Hop, number> = { 0: 1500, 1: 1300, 2: 1900, 3: 2400 };

function next(hop: Hop): Hop {
  return hop === 3 ? 0 : ((hop + 1) as Hop);
}

function useInView() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => setInView(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.3 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, inView };
}

function useHops(inView: boolean) {
  const [auto, setAuto] = useState<Hop>(0);
  const [held, setHeld] = useState<Hop | null>(null);
  const [reduced, setReduced] = useState(false);
  const hop = held ?? auto;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);
    if (media.matches) setAuto(3);
  }, []);

  useEffect(() => {
    if (held !== null || reduced || !inView) return;
    const timer = window.setTimeout(() => setAuto(next(hop)), dwellMs[hop]);
    return () => window.clearTimeout(timer);
  }, [held, hop, inView, reduced]);

  function hold(target: Hop) {
    setHeld(target);
  }

  function release() {
    if (held !== null) setAuto(held);
    setHeld(null);
  }

  return { hop, hold, release, jump: setAuto };
}

export function PipelineScene() {
  const view = useInView();
  const hops = useHops(view.inView);
  const style: HopStyle = { "--hop": hops.hop };

  return (
    <Scene backdrop="glow" className="flex h-[420px] flex-col gap-3 p-4 sm:p-5">
      <div ref={view.ref} className="pipeline relative pt-1" style={style}>
        <span aria-hidden="true" className="rail" />
        <span aria-hidden="true" className="rail-done" />
        <span aria-hidden="true" className="rail-packet" />
        <ol className="relative grid grid-cols-4 gap-1">
          {stations.map((station) => {
            const reached = hops.hop >= station.hop;
            return (
              <li key={station.hop} className="flex justify-center">
                <button
                  type="button"
                  aria-pressed={hops.hop === station.hop}
                  onPointerEnter={() => hops.hold(station.hop)}
                  onPointerLeave={() => hops.release()}
                  onFocus={() => hops.hold(station.hop)}
                  onBlur={() => hops.release()}
                  onClick={() => hops.jump(station.hop)}
                  className="station flex w-full flex-col items-center gap-1.5 rounded-xl px-1 pb-1 text-center"
                >
                  <span
                    data-reached={reached ? "" : undefined}
                    data-active={hops.hop === station.hop ? "" : undefined}
                    className="station-tile flex size-10 items-center justify-center rounded-xl"
                  >
                    <station.icon className="size-4" />
                  </span>
                  <span className="font-mono text-[0.62rem] font-medium text-fg">
                    {station.label}
                  </span>
                  <span
                    className={`flex items-center gap-1 text-[0.55rem] leading-tight transition-colors duration-300 ${reached ? "text-fg" : "text-muted"}`}
                  >
                    <CheckIcon
                      className={`station-check size-2.5 text-ok ${reached ? "" : "is-hidden"}`}
                    />
                    {station.detail}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        <div className="sticker-hover relative z-10 w-full max-w-[330px] overflow-hidden rounded-xl bg-[#2b2624] text-[#f3ece8] shadow-[0_18px_36px_-18px_rgb(40_20_10/0.7)]">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <span className="flex items-center gap-2 text-[0.65rem]">
              <span className="animate-live size-1.5 rounded-full bg-accent" />
              One event, four hops
            </span>
            <span className="font-mono text-[0.58rem] text-white/45">POST /v2/events</span>
          </div>
          <ol className="flex flex-col gap-1 px-3 py-2.5">
            {lines.map((line, index) => {
              const style: LineStyle = { "--i": index };
              return (
                <li
                  key={index}
                  data-reached={hops.hop >= line.hop ? "" : undefined}
                  style={style}
                  className="hop-line grid grid-cols-[38px_1fr] items-baseline gap-2 font-mono text-[0.62rem]"
                >
                  <span className="text-white/40">{line.tag}</span>
                  <span className="truncate text-white/85">{line.text}</span>
                </li>
              );
            })}
          </ol>
          <div className="flex items-center justify-between border-t border-white/10 px-3 py-2 font-mono text-[0.58rem]">
            <span className="text-white/45">browser to row</span>
            <span
              data-reached={hops.hop === 3 ? "" : undefined}
              className="hop-stamp flex items-center gap-1.5 text-ok"
            >
              <CheckIcon className="size-3" />
              stored in 38 ms
            </span>
          </div>
        </div>
        <Sticker className="bottom-2 left-0" tilt={4} delay={0.6}>
          <div className="rounded-full bg-[#ffe6a8] px-2.5 py-1 text-[0.62rem] font-medium text-[#7a5310] shadow-[0_10px_20px_-12px_rgb(120_80_20/0.6)]">
            Batch of 20 or every 5 s
          </div>
        </Sticker>
        <Sticker className="right-0 bottom-4" tilt={-4} delay={1.4}>
          <div className={`${card} px-2.5 py-1.5 font-mono text-[0.58rem] text-muted`}>
            retries after 1, 4, 16 s
          </div>
        </Sticker>
        <Sticker className="top-4 right-0" tilt={5} delay={1}>
          <div className={`${card} px-2.5 py-1.5 text-[0.6rem] text-fg`}>
            sendBeacon when the page hides
          </div>
        </Sticker>
      </div>
    </Scene>
  );
}
