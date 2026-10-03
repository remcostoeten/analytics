import { ActivityTicker } from "./activity-ticker";
import { HeroSurface } from "./hero-surface";
import { Button } from "./primitives";
import { TaskBoard } from "./task-board";
import { Tilt } from "./tilt";

const titleLines = [
  { text: "Turn scattered tasks", delay: "[--delay:0ms]" },
  { text: "into shipped software.", delay: "[--delay:120ms]" },
];

export function Hero() {
  return (
    <HeroSurface>
      <div className="relative flex flex-col items-center px-8 pt-24 text-center">
        <p className="rise eyebrow flex items-center gap-2 text-fog [--delay:0ms]">
          <span className="size-1.5 bg-ember" />
          Planning, tracking and shipping in one place
        </p>
        <h1 className="hero-title font-display mt-8 text-[52px] leading-[0.98] tracking-[-0.015em] text-white md:text-[72px] lg:text-[88px]">
          {titleLines.map((line) => (
            <span key={line.text} className={`rise block ${line.delay}`}>
              {line.text}
            </span>
          ))}
        </h1>
        <p className="rise mt-7 max-w-xl text-[17px] leading-[1.55] text-mist [--delay:300ms]">
          Merge a branch and the ticket moves itself. Every teammate looks at the same board, so the
          status meeting has nothing left to cover.
        </p>
        <div className="rise mt-10 flex flex-wrap justify-center gap-3 [--delay:420ms]">
          <Button tone="metal">Start for free</Button>
          <Button tone="dark" arrow>
            Watch the demo
          </Button>
        </div>
        <div className="rise mt-8 [--delay:560ms]">
          <ActivityTicker />
        </div>
      </div>
      <div className="relative mx-auto mt-16 max-w-[1240px] px-8">
        <div className="hero-halo pointer-events-none absolute inset-x-8 -top-10 h-24" />
        <Tilt className="slide-up relative" strength={2.5} glare={false}>
          <div className="board-window overflow-hidden rounded-t-md border border-b-0 border-line-strong bg-ink-deep shadow-[0_-20px_80px_rgb(0_0_0/0.5)]">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-line px-4 py-2.5">
              <span className="flex gap-1.5">
                <i className="size-1.5 rounded-full bg-line-strong transition-colors hover:bg-[#ff5f57]" />
                <i className="size-1.5 rounded-full bg-line-strong transition-colors hover:bg-[#febc2e]" />
                <i className="size-1.5 rounded-full bg-line-strong transition-colors hover:bg-[#28c840]" />
              </span>
              <span className="eyebrow text-fog">app.stackly.dev / platform / tasks</span>
              <span />
            </div>
            <div className="h-[560px]">
              <TaskBoard />
            </div>
          </div>
        </Tilt>
      </div>
    </HeroSurface>
  );
}
