import type { IconName } from "./icons";
import { Icon } from "./icons";

const timelineRows = [
  { owner: "Judha Mayutina", task: "TASK-1182 Fix onboarding flow bug", tone: "bg-[#4f8df5]" },
  { owner: "Ben Barlow", task: "TASK-1130 Add dark mode support", tone: "bg-ember" },
  { owner: "Ben Barlow", task: "TASK-1104 Optimize API response", tone: "bg-leaf" },
];

export function TimelineFigure() {
  return (
    <div className="relative h-full overflow-hidden">
      <div className="tilt-timeline absolute inset-x-6 top-10">
        <div className="mb-3 flex items-center justify-between border-b border-line pb-2">
          <span className="flex gap-3">
            {Array.from({ length: 14 }, (_, index) => (
              <span key={index} className="h-2 w-px bg-line-strong" />
            ))}
          </span>
          <span className="eyebrow rounded-sm border border-line-strong bg-ink-panel px-2 py-0.5 text-[8px] text-mist">
            Sprint 14
          </span>
        </div>
        <div className="space-y-2.5">
          {timelineRows.map((row, index) => (
            <div key={row.task} style={{ marginLeft: index * 18 }}>
              <p className="mb-1 text-[8px] text-fog">{row.owner}</p>
              <div className="flex items-center gap-2 rounded-sm border border-line-strong bg-linear-to-r from-[#1c1c1f] to-[#0f0f11] px-2.5 py-1.5">
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
  const ghosts = [0, 1, 2, 3, 4];
  return (
    <div className="relative h-full">
      {ghosts.map((ghost) => (
        <div
          key={ghost}
          className="ghost absolute right-[-30px] left-16 rounded-sm border border-line-strong bg-ink-panel px-4 py-3"
          style={{
            top: 56 + ghost * 14,
            opacity: 1 - ghost * 0.22,
            transform: `scale(${1 - ghost * 0.03})`,
            filter: `blur(${ghost * 0.6}px)`,
            zIndex: 10 - ghost,
          }}
        >
          <p className="text-[13px] text-paper">Focus Mode enabled. Notifications paused.</p>
          <p className="mt-1 text-[10px] text-fog">Stay heads-down for the next 90 minutes.</p>
        </div>
      ))}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-transparent to-ink" />
    </div>
  );
}

export function CardsFigure() {
  const stack = [
    { label: "Start", title: "Ze", status: "" },
    { label: "Doing", title: "API", status: "" },
    { label: "Start", title: "Onboarding flow redesign", status: "Unassigned" },
  ];
  return (
    <div className="relative h-full overflow-hidden">
      <div className="tilt-cards absolute top-14 left-10 w-[240px]">
        {stack.map((card, index) => (
          <div
            key={card.title}
            className="absolute rounded-sm border border-line-strong bg-linear-to-br from-[#1d1d20] to-[#0f0f11] p-3 shadow-[0_20px_40px_rgb(0_0_0/0.5)]"
            style={{ left: index * 28, top: index * 22, width: 220, opacity: 0.45 + index * 0.275 }}
          >
            <div className="flex items-center justify-between">
              <span className="eyebrow flex items-center gap-1.5 text-[8px] text-fog">
                <Icon name="note" size={9} />
                {card.label}
              </span>
              <span className="text-fog">···</span>
            </div>
            <p className="mt-2 text-[13px] text-paper">{card.title}</p>
            {card.status ? (
              <p className="mt-2 flex items-center gap-1.5 text-[10px] text-leaf">
                <span className="size-1.5 rounded-full bg-leaf" />
                {card.status}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

const toolbarIcons: IconName[] = ["inbox", "check-square", "file", "chart", "compass"];

export function ToolbarFigure() {
  return (
    <div className="relative h-full overflow-hidden">
      <svg
        viewBox="0 0 400 600"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <filter id="rock" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.012 0.02" numOctaves="5" seed="7" />
            <feDiffuseLighting lightingColor="#9a9aa0" surfaceScale="9" diffuseConstant="1.1">
              <feDistantLight azimuth="235" elevation="38" />
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
      <div className="absolute top-[53%] left-1/2 flex -translate-x-1/2 gap-1 rounded-xl border border-line-strong bg-[#141416]/90 p-1.5 shadow-[0_20px_50px_rgb(0_0_0/0.7)] backdrop-blur">
        {toolbarIcons.map((icon, index) => (
          <span
            key={icon}
            className={`tool flex size-11 items-center justify-center rounded-lg ${index === 1 ? "bg-ink-panel text-paper shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]" : "text-fog"}`}
          >
            <Icon name={icon} size={18} />
          </span>
        ))}
      </div>
    </div>
  );
}

function Slab({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative size-[150px]">
      <div className="iso absolute inset-0">
        <div className="absolute inset-0 rounded-md border border-line-strong bg-linear-to-br from-[#1b1b1e] to-[#0c0c0e] shadow-[0_18px_30px_rgb(0_0_0/0.6)]" />
        <div className="absolute inset-3 rounded-md border border-line bg-[#111113]" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center text-mist">{children}</div>
    </div>
  );
}

export function StackFigure() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-0">
      <div className="dust dust-right pointer-events-none absolute inset-0" />
      <div className="float relative -translate-y-2">
        <Slab>
          <span className="flex size-10 items-center justify-center rounded-full border border-mist/40">
            <Icon name="compass" size={18} />
          </span>
        </Slab>
      </div>
      <div className="relative flex -translate-y-10 flex-col items-center gap-0.5 text-[8px] text-fog">
        <span>⌃⌃</span>
        <span>⌄⌄</span>
      </div>
      <div className="float float-late relative -translate-y-12">
        <Slab>
          <Icon name="group" size={20} />
        </Slab>
      </div>
    </div>
  );
}
