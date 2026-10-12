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
import { CheckIcon, DatabaseIcon, KeyIcon, RouteIcon, SparkIcon, WindowIcon } from "./icons";
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
              ...stagger(index + 1),
              left: `calc(50% + ${point.x}px)`,
              top: `calc(50% + ${point.y}px)`,
            }}
            className="piece absolute -translate-1/2"
          >
            <span className="orbit-mark flex size-10 items-center justify-center rounded-xl border border-line bg-surface shadow-[0_6px_16px_-10px_rgb(var(--shade)/0.35)]">
              {target.mark}
            </span>
          </span>
        );
      })}
      <span className="piece orbit-core tile-glow absolute top-1/2 left-1/2 flex size-16 -translate-1/2 items-center justify-center rounded-2xl">
        <Logo className="size-8" />
      </span>
    </div>
  );
}

type Hop = {
  name: string;
  label: string;
  icon: ReactNode;
};

const hops: Hop[] = [
  { name: "browser", label: "browser", icon: <WindowIcon className="size-4.5 text-fg" /> },
  { name: "route", label: "/_ra", icon: <RouteIcon className="size-4.5 text-white" /> },
  { name: "api", label: "api", icon: <DatabaseIcon className="size-4.5 text-fg" /> },
];

export function ProxyVisual() {
  return (
    <div aria-hidden="true" className="proxy-hops relative mx-auto w-[236px] pt-7 pb-1">
      <svg
        viewBox="0 0 236 44"
        style={stagger(1)}
        className="piece absolute inset-x-0 top-7 h-11 w-full"
      >
        <line
          x1="22"
          y1="22"
          x2="214"
          y2="22"
          pathLength="24"
          strokeDasharray="0.45 0.55"
          className="dash-ring"
        />
      </svg>
      <span className="proxy-dot absolute top-[calc(1.75rem+22px)] left-11 z-[5] size-2 -translate-1/2 rounded-full bg-accent shadow-[0_0_0_3px_rgb(254_81_1/0.18)]" />
      <div className="relative z-10 flex justify-between">
        {hops.map((hop, index) => (
          <div
            key={hop.name}
            style={stagger(index)}
            className="piece flex w-11 flex-col items-center gap-1.5"
          >
            <span
              className={
                hop.name === "route"
                  ? "proxy-node tile-glow flex size-11 items-center justify-center rounded-xl"
                  : "proxy-node flex size-11 items-center justify-center rounded-xl border border-line bg-surface shadow-[0_6px_16px_-10px_rgb(var(--shade)/0.35)]"
              }
            >
              {hop.icon}
            </span>
            <span
              className={`font-mono text-[0.6rem] ${hop.name === "route" ? "text-accent" : "text-muted"}`}
            >
              {hop.label}
            </span>
          </div>
        ))}
      </div>
      <span className="proxy-key absolute top-0 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-line bg-surface px-2 py-0.5 font-mono text-[0.58rem] whitespace-nowrap text-fg shadow-sm">
        <KeyIcon className="size-2.5 text-accent" />
        secret key
      </span>
      <span className="proxy-ok absolute top-0 right-0 z-20 flex items-center gap-1 rounded-full border border-ok/30 bg-surface px-2 py-0.5 font-mono text-[0.58rem] text-ok shadow-sm">
        <CheckIcon className="size-2.5" />
        204
      </span>
    </div>
  );
}

const methods = ["client", "API", "SQL"];

const rows = [
  { path: "/", views: "1,904", share: 100 },
  { path: "/docs", views: "1,211", share: 64 },
  { path: "/pricing", views: "802", share: 42 },
];

export function ReadVisual() {
  return (
    <div
      aria-hidden="true"
      className="read-visual mx-auto flex w-full max-w-[250px] flex-col gap-4"
    >
      <div className="flex items-center gap-1.5">
        {methods.map((method, index) => (
          <span key={method} style={stagger(index)} className="piece">
            <span className="read-method block rounded-full border border-line bg-surface/70 px-2.5 py-0.5 font-mono text-[0.6rem] text-muted">
              {method}
            </span>
          </span>
        ))}
        <span
          style={stagger(3)}
          className="piece ml-auto flex items-center gap-1 font-mono text-[0.58rem] text-accent"
        >
          <SparkIcon className="size-2.5" />
          read only
        </span>
      </div>
      <ul className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-2.5 font-mono text-[0.62rem]">
        {rows.map((row, index) => {
          const style: BarStyle = { "--i": index + 1, "--w": `${row.share}%` };
          return (
            <li key={row.path} style={style} className="contents">
              <span className="piece text-fg">{row.path}</span>
              <span className="piece h-2 overflow-hidden rounded-full bg-surface/70">
                <span className="read-bar block h-full rounded-full bg-accent" />
              </span>
              <span className="piece text-muted tabular-nums">{row.views}</span>
            </li>
          );
        })}
      </ul>
      <div
        style={stagger(4)}
        className="piece read-status flex justify-between font-mono text-[0.55rem] text-muted"
      >
        <span>3 rows</span>
        <span>12 ms</span>
      </div>
    </div>
  );
}
