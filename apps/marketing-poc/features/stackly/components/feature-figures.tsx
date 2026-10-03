"use client";

import { useState } from "react";

import { useInterval } from "../hooks/use-interval";
import type { IconName } from "./icons";
import { Icon } from "./icons";

const timelineRows = [
  { owner: "Judha Mayutina", task: "TASK-1182 Fix onboarding flow bug", tone: "bg-[#4f8df5]" },
  { owner: "Ben Barlow", task: "TASK-1130 Add dark mode support", tone: "bg-ember" },
  { owner: "Ben Barlow", task: "TASK-1104 Optimize API response", tone: "bg-leaf" },
  { owner: "Mara Lind", task: "TASK-1097 Rotate signing keys", tone: "bg-[#c653d8]" },
];

export function TimelineFigure() {
  const [offset, setOffset] = useState(0);
  useInterval(() => setOffset((value) => (value + 1) % timelineRows.length), 2600);
  const ordered = [...timelineRows.slice(offset), ...timelineRows.slice(0, offset)].slice(0, 3);
  return (
    <div className="relative h-full overflow-hidden">
      <div className="tilt-timeline absolute inset-x-6 top-10">
        <div className="mb-3 flex items-center justify-between border-b border-line pb-2">
          <span className="flex gap-3">
            {Array.from({ length: 14 }, (_, index) => (
              <span
                key={index}
                className="tick h-2 w-px bg-line-strong"
                style={{ animationDelay: `${index * 120}ms` }}
              />
            ))}
          </span>
          <span className="eyebrow rounded-sm border border-line-strong bg-ink-panel px-2 py-0.5 text-[8px] text-mist">
            Sprint 14
          </span>
        </div>
        <div className="space-y-2.5">
          {ordered.map((row, index) => (
            <div
              key={row.task}
              className="animate-[row-in_500ms_ease-out]"
              style={{ marginLeft: index * 18 }}
            >
              <p className="mb-1 text-[8px] text-fog">{row.owner}</p>
              <div className="flex items-center gap-2 rounded-sm border border-line-strong bg-linear-to-r from-[#1c1c1f] to-[#0f0f11] px-2.5 py-1.5 transition-colors hover:border-fog">
                <span className={`size-2 rounded-full ${row.tone}`} />
                <span className="mono text-[8px] text-mist">{row.task}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-ink via-transparent to-transparent" />
    </div>
  );
}

export function FocusFigure() {
  const [enabled, setEnabled] = useState(true);
  const ghosts = [0, 1, 2, 3, 4];
  return (
    <div className="relative h-full">
      <button
        type="button"
        onClick={() => setEnabled((value) => !value)}
        aria-pressed={enabled}
        className="absolute top-4 left-5 z-20 flex items-center gap-2 text-[10px] text-fog"
      >
        <span
          data-on={enabled}
          className="relative h-4 w-7 rounded-full bg-line transition-colors data-[on=true]:bg-ember"
        >
          <span
            data-on={enabled}
            className="absolute top-0.5 left-0.5 size-3 rounded-full bg-paper transition-transform data-[on=true]:translate-x-3"
          />
        </span>
        Focus {enabled ? "on" : "off"}
      </button>
      {ghosts.map((ghost) => (
        <div
          key={ghost}
          data-on={enabled}
          className="ghost absolute right-[-30px] left-16 rounded-sm border border-line-strong bg-ink-panel px-4 py-3 transition-all duration-500 data-[on=false]:translate-x-6 data-[on=false]:opacity-0"
          style={{
            top: 56 + ghost * 14,
            opacity: 1 - ghost * 0.22,
            transform: `scale(${1 - ghost * 0.03})`,
            filter: `blur(${ghost * 0.6}px)`,
            zIndex: 10 - ghost,
            transitionDelay: `${ghost * 60}ms`,
          }}
        >
          <p className="text-[13px] text-paper">Focus Mode enabled. Notifications paused.</p>
          <p className="mt-1 text-[10px] text-fog">Stay heads-down for the next 90 minutes.</p>
        </div>
      ))}
      <div
        data-on={enabled}
        className="absolute top-[72px] right-[-10px] left-16 rounded-sm border border-line-strong bg-ink-panel px-4 py-3 transition-all delay-200 duration-500 data-[on=true]:-translate-x-6 data-[on=true]:opacity-0"
      >
        <p className="text-[13px] text-paper">3 mentions, 1 review request.</p>
        <p className="mt-1 text-[10px] text-fog">Delivered while you were away.</p>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-transparent to-ink" />
    </div>
  );
}

const stack = [
  { label: "Start", title: "Zero-downtime deploys", status: "Unassigned" },
  { label: "Doing", title: "API rate limits", status: "Ben Barlow" },
  { label: "Start", title: "Onboarding flow redesign", status: "Unassigned" },
];

export function CardsFigure() {
  const [front, setFront] = useState(2);
  useInterval(() => setFront((value) => (value + 1) % stack.length), 3400);
  return (
    <div className="relative h-full overflow-hidden">
      <div className="tilt-cards absolute top-14 left-10 w-[240px]">
        {stack.map((card, index) => {
          const order = (index - front + stack.length) % stack.length;
          const depth = stack.length - 1 - order;
          return (
            <button
              type="button"
              key={card.title}
              onClick={() => setFront(index)}
              className="absolute rounded-sm border border-line-strong bg-linear-to-br from-[#1d1d20] to-[#0f0f11] p-3 text-left shadow-[0_20px_40px_rgb(0_0_0/0.5)] transition-all duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] hover:border-fog"
              style={{
                left: depth * 28,
                top: depth * 22,
                width: 220,
                opacity: 0.45 + depth * 0.275,
                zIndex: depth,
              }}
            >
              <div className="flex items-center justify-between">
                <span className="eyebrow flex items-center gap-1.5 text-[8px] text-fog">
                  <Icon name="note" size={9} />
                  {card.label}
                </span>
                <span className="text-fog">···</span>
              </div>
              <p className="mt-2 text-[13px] text-paper">{card.title}</p>
              <p className="mt-2 flex items-center gap-1.5 text-[10px] text-leaf">
                <span className="size-1.5 rounded-full bg-leaf" />
                {card.status}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const toolbarIcons: { icon: IconName; label: string }[] = [
  { icon: "inbox", label: "Import" },
  { icon: "check-square", label: "Mark done" },
  { icon: "file", label: "Notes" },
  { icon: "chart", label: "Insights" },
  { icon: "compass", label: "Explore" },
];

export function ToolbarFigure() {
  const [active, setActive] = useState(1);
  const [auto, setAuto] = useState(true);
  useInterval(() => setActive((value) => (value + 1) % toolbarIcons.length), 2200, auto);
  const current = toolbarIcons[active] ?? toolbarIcons[0]!;
  return (
    <div
      className="relative h-full overflow-hidden"
      onPointerEnter={() => setAuto(false)}
      onPointerLeave={() => setAuto(true)}
    >
      <svg
        viewBox="0 0 400 600"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <filter id="rock" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="5" seed="7">
              <animate
                attributeName="baseFrequency"
                values="0.012 0.02;0.013 0.021;0.012 0.02"
                dur="12s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDiffuseLighting lightingColor="#9a9aa0" surfaceScale="9" diffuseConstant="1.1">
              <feDistantLight azimuth="235" elevation="38">
                <animate
                  attributeName="azimuth"
                  values="225;250;225"
                  dur="10s"
                  repeatCount="indefinite"
                />
              </feDistantLight>
            </feDiffuseLighting>
            <feComponentTransfer>
              <feFuncR type="gamma" exponent="2.4" />
              <feFuncG type="gamma" exponent="2.4" />
              <feFuncB type="gamma" exponent="2.4" />
            </feComponentTransfer>
          </filter>
          <radialGradient id="rock-glow" cx="50%" cy="38%" r="55%">
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.55" stopColor="#fff" stopOpacity="0.6" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id="rock-mask">
            <path
              d="M40 300 C60 230 120 210 170 190 C200 178 220 150 250 160 C300 176 330 220 350 270 C370 320 320 350 270 360 C210 372 150 400 100 380 C60 364 30 340 40 300 Z"
              fill="url(#rock-glow)"
            />
            <path
              d="M0 470 C80 440 140 470 200 500 C260 530 330 520 400 500 L400 600 L0 600 Z"
              fill="url(#rock-glow)"
            />
          </mask>
        </defs>
        <rect width="400" height="600" filter="url(#rock)" mask="url(#rock-mask)" />
      </svg>
      <div className="absolute top-[44%] left-1/2 -translate-x-1/2">
        <span className="mono block text-center text-[10px] text-fog transition-opacity">
          {current.label}
        </span>
      </div>
      <div className="absolute top-[53%] left-1/2 flex -translate-x-1/2 gap-1 rounded-xl border border-line-strong bg-[#141416]/90 p-1.5 shadow-[0_20px_50px_rgb(0_0_0/0.7)] backdrop-blur">
        <span
          className="absolute top-1.5 left-1.5 size-11 rounded-lg bg-ink-panel shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)] transition-transform duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)]"
          style={{ transform: `translateX(${active * 48}px)` }}
        />
        {toolbarIcons.map((item, index) => (
          <button
            type="button"
            key={item.icon}
            aria-label={item.label}
            onClick={() => setActive(index)}
            data-active={index === active}
            className="relative z-10 flex size-11 items-center justify-center rounded-lg text-fog transition-[color,transform] hover:text-paper active:scale-90 data-[active=true]:text-paper"
          >
            <Icon name={item.icon} size={18} />
          </button>
        ))}
      </div>
    </div>
  );
}

const integrations = ["GitHub", "Linear", "Slack", "Notion", "Figma"];

function Slab({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="group/slab relative size-[150px]">
      <div className="iso absolute inset-0 transition-transform duration-500 group-hover/slab:-translate-y-2">
        <div className="absolute inset-0 rounded-md border border-line-strong bg-linear-to-br from-[#1b1b1e] to-[#0c0c0e] shadow-[0_18px_30px_rgb(0_0_0/0.6)]" />
        <div className="absolute inset-3 rounded-md border border-line bg-[#111113] transition-colors group-hover/slab:border-ember/50" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center text-mist transition-colors group-hover/slab:text-ember">
        {children}
      </div>
      <span className="eyebrow absolute -bottom-2 left-1/2 -translate-x-1/2 text-fog opacity-0 transition-opacity group-hover/slab:opacity-100">
        {label}
      </span>
    </div>
  );
}

export function StackFigure() {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="relative flex h-full flex-col items-center justify-center gap-0"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <div className="float relative -translate-y-2">
        <Slab label="Stackly">
          <span className="flex size-10 items-center justify-center rounded-full border border-current/40">
            <Icon name="compass" size={18} />
          </span>
        </Slab>
      </div>
      <div className="relative flex -translate-y-10 flex-col items-center gap-0.5 text-[8px] text-fog">
        <span className="flow-down">⌃⌃</span>
        <span className="flow-down" style={{ animationDelay: "400ms" }}>
          ⌄⌄
        </span>
      </div>
      <div className="float float-late relative -translate-y-12">
        <Slab label="Your tools">
          <Icon name="group" size={20} />
        </Slab>
      </div>
      <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
        {integrations.map((name, index) => (
          <span
            key={name}
            data-on={hovered}
            className="eyebrow rounded-sm border border-line bg-ink-panel px-2 py-0.5 text-[8px] text-fog opacity-0 transition-all duration-400 data-[on=true]:opacity-100"
            style={{
              transitionDelay: `${index * 60}ms`,
              transform: hovered ? "none" : "translateY(8px)",
            }}
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
