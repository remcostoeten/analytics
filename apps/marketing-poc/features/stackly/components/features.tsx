import type { Feature } from "../content";
import { features } from "../content";
import { StackFigure, TerrainFigure } from "./figures";
import { Eyebrow, Heading } from "./primitives";

function Timeline() {
  const rows = [
    "TASK-212 Fix onboarding flow bug",
    "TASK-198 Add dark mode support",
    "TASK-173 Migrate billing jobs",
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-3 px-5">
      <span className="eyebrow self-end border border-line px-2 py-0.5 text-fog">Sprint 14</span>
      {rows.map((row, index) => (
        <div
          key={row}
          className="flex items-center gap-2 border border-line bg-ink-panel px-3 py-2 font-mono text-[10px] text-fog"
        >
          <span
            className={`size-1.5 rounded-full ${index === 1 ? "bg-ember" : "bg-line-strong"}`}
          />
          {row}
        </div>
      ))}
    </div>
  );
}

function Focus() {
  return (
    <div className="flex h-full items-center px-5">
      <div className="ml-auto w-5/6 border border-line bg-ink-panel px-4 py-3 text-[11px]">
        <p className="text-paper">Focus Mode enabled. Notifications paused.</p>
        <p className="mt-1 text-fog">Stay heads-down for the next 90 minutes.</p>
      </div>
    </div>
  );
}

function Cards() {
  return (
    <div className="flex h-full items-center px-5">
      <div className="w-3/4 border border-line bg-ink-panel p-3 text-[11px]">
        <p className="eyebrow text-fog">Design</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-paper">Onboarding flow redesign</span>
          <span className="border border-line px-1.5 py-0.5 text-[9px] text-fog">Start</span>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-fog">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Unassigned
        </p>
      </div>
    </div>
  );
}

function Toolbar() {
  return (
    <div className="flex h-full flex-col justify-end px-5 pb-8">
      <div className="h-24 opacity-70">
        <TerrainFigure />
      </div>
      <div className="mx-auto flex gap-1 border border-line bg-ink-panel p-1">
        {Array.from({ length: 5 }, (_, index) => (
          <span
            key={index}
            className={`flex size-7 items-center justify-center border ${index === 1 ? "border-ember text-ember" : "border-transparent text-fog"}`}
          >
            <span className="size-2.5 border border-current" />
          </span>
        ))}
      </div>
    </div>
  );
}

function Figure({ figure }: { figure: Feature["figure"] }) {
  if (figure === "timeline") return <Timeline />;
  if (figure === "terrain") return <TerrainFigure />;
  if (figure === "focus") return <Focus />;
  if (figure === "cards") return <Cards />;
  if (figure === "toolbar") return <Toolbar />;
  return (
    <div className="h-full px-10 py-4">
      <StackFigure />
    </div>
  );
}

export function Features() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <Eyebrow centered>Our features</Eyebrow>
      <div className="mt-4">
        <Heading centered size="md">
          Plan in minutes. <span className="text-mist">Adjust in seconds.</span> Ship
          <br />
          with confidence <span className="text-mist">at any scale.</span>
        </Heading>
      </div>
      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <li key={feature.name} className="flex flex-col border border-line bg-ink-raised">
            <div className="h-52 border-b border-line bg-ink">
              <Figure figure={feature.figure} />
            </div>
            {feature.note ? (
              <div className="p-5">
                <p className="text-sm text-paper">{feature.name}</p>
                <p className="mt-2 text-[11px] leading-relaxed text-fog">{feature.note}</p>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
