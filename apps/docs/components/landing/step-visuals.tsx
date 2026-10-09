import type { CSSProperties, ReactNode } from "react";

import { Logo } from "@/components/logo";

import {
  AstroMark,
  NextMark,
  NodeMark,
  ReactMark,
  SvelteMark,
  TypeScriptMark,
  VueMark,
} from "./brand-marks";
import { CheckIcon, SparkIcon } from "./icons";
import { stagger } from "./stagger";

type Target = {
  name: string;
  mark: ReactNode;
};

type BarStyle = CSSProperties & { "--i": number; "--w": string };

const orbitSize = 196;
const orbitRadius = 74;
const center = orbitSize / 2;

const targets: Target[] = [
  { name: "Next", mark: <NextMark className="size-6 text-fg" /> },
  { name: "React", mark: <ReactMark className="size-6" /> },
  { name: "Vue", mark: <VueMark className="size-6" /> },
  { name: "Svelte", mark: <SvelteMark className="size-6" /> },
  { name: "Astro", mark: <AstroMark className="size-6" /> },
  { name: "TypeScript", mark: <TypeScriptMark className="size-6 rounded-[5px]" /> },
  { name: "Node", mark: <NodeMark className="size-6" /> },
];

function orbitPoint(index: number, total: number) {
  const angle = (index / total) * Math.PI * 2 + Math.PI / 2;
  return {
    x: Math.round(Math.cos(angle) * orbitRadius),
    y: Math.round(Math.sin(angle) * orbitRadius),
  };
}

export function InstallVisual() {
  return (
    <div
      aria-hidden="true"
      className="orbit relative shrink-0 translate-y-1.5"
      style={{ width: orbitSize, height: orbitSize }}
    >
      <svg viewBox={`0 0 ${orbitSize} ${orbitSize}`} className="absolute inset-0 size-full">
        {targets.map((target, index) => {
          const point = orbitPoint(index, targets.length);
          return (
            <line
              key={target.name}
              x1={center}
              y1={center}
              x2={center + point.x}
              y2={center + point.y}
              pathLength="10"
              strokeDasharray="0.4 0.6"
              className="dash-spoke"
            />
          );
        })}
        <circle
          cx={center}
          cy={center}
          r={orbitRadius}
          pathLength="66"
          strokeDasharray="0.45 0.55"
          className="dash-ring"
        />
      </svg>
      {targets.map((target, index) => {
        const point = orbitPoint(index, targets.length);
        return (
          <span
            key={target.name}
            style={{
              ...stagger(index),
              left: `calc(50% + ${point.x}px)`,
              top: `calc(50% + ${point.y}px)`,
            }}
            className="orbit-mark absolute flex size-10 -translate-1/2 items-center justify-center rounded-xl border border-line bg-surface shadow-[0_6px_16px_-10px_rgb(var(--shade)/0.35)]"
          >
            {target.mark}
          </span>
        );
      })}
      <span className="orbit-core tile-glow absolute top-1/2 left-1/2 flex size-16 -translate-1/2 items-center justify-center rounded-2xl">
        <Logo className="size-8" />
      </span>
    </div>
  );
}

export function ProxyVisual() {
  return (
    <div aria-hidden="true" className="proxy-visual relative mx-auto w-full max-w-[270px]">
      <div className="proxy-route absolute -top-3 left-4 z-10 rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-[0.62rem] text-fg shadow-sm">
        yoursite.com<span className="text-accent">/_ra</span>
      </div>
      <span className="proxy-request absolute top-0.5 left-[9px] z-20 size-2 rounded-full bg-accent shadow-[0_0_0_3px_rgb(254_81_1/0.18)]" />
      <div className="rounded-xl border border-line bg-surface p-3 pt-5 font-mono text-[0.62rem] leading-[1.7] shadow-[0_12px_28px_-16px_rgb(var(--shade)/0.4)]">
        <div className="text-muted">app/_ra/route.ts</div>
        <div className="mt-1.5">
          <span className="text-muted">export const</span> <span className="text-fg">POST</span>{" "}
          <span className="text-muted">=</span>
        </div>
        <div className="proxy-line -mx-1.5 rounded px-1.5 pl-[18px]">
          <span className="text-accent">createProxy</span>
          <span className="text-muted">{"({"}</span>
        </div>
        <div className="pl-6 text-fg">secret, endpoint</div>
        <div className="pl-3 text-muted">{"});"}</div>
      </div>
      <div className="proxy-response absolute right-3 -bottom-3 z-10 flex items-center gap-1 rounded-full border border-ok/30 bg-surface px-2 py-0.5 font-mono text-[0.58rem] text-ok shadow-sm">
        <CheckIcon className="size-2.5" />
        204 · forwarded with the key
      </div>
    </div>
  );
}

const rows = [
  { path: "/", views: "1,904", share: 100 },
  { path: "/docs", views: "1,211", share: 64 },
  { path: "/pricing", views: "802", share: 42 },
];

export function ReadVisual() {
  return (
    <div
      aria-hidden="true"
      className="read-visual mx-auto w-full max-w-[270px] rounded-xl border border-line bg-surface p-3 shadow-[0_12px_28px_-16px_rgb(var(--shade)/0.4)]"
    >
      <div className="flex items-center justify-between text-[0.62rem] text-muted">
        <span>Query</span>
        <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-accent">
          <SparkIcon className="size-2.5" />
          read only
        </span>
      </div>
      <div className="read-sql relative mt-2 overflow-hidden rounded-md bg-bg px-2 py-1.5 font-mono text-[0.6rem] leading-[1.6] text-fg">
        <span className="text-muted">SELECT</span> path, count(*){" "}
        <span className="text-muted">AS</span> views
        <br />
        <span className="text-muted">FROM</span> events <span className="text-muted">GROUP BY</span>{" "}
        path
      </div>
      <ul className="mt-2 flex flex-col">
        {rows.map((row, index) => {
          const style: BarStyle = { "--i": index, "--w": `${row.share}%` };
          return (
            <li
              key={row.path}
              style={style}
              className="relative flex justify-between border-b border-dashed border-line py-1 font-mono text-[0.62rem] last:border-0"
            >
              <span className="read-bar absolute inset-y-0.5 -left-1 rounded-sm bg-accent/10" />
              <span className="relative text-fg">{row.path}</span>
              <span className="relative text-muted tabular-nums">{row.views}</span>
            </li>
          );
        })}
      </ul>
      <div className="read-status mt-1.5 flex justify-between font-mono text-[0.55rem] text-muted">
        <span>3 rows</span>
        <span>12 ms</span>
      </div>
    </div>
  );
}
