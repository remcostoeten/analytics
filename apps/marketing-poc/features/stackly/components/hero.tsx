import { awards } from "../content";
import { HeroSurface } from "./hero-surface";
import { Laurel } from "./laurel";
import { Button } from "./primitives";
import { TaskBoard } from "./task-board";

const titleLines = [
  { text: "Turn Scattered Tasks", delay: "[--delay:0ms]" },
  { text: "Into Shipped", delay: "[--delay:120ms]" },
  { text: "Software", delay: "[--delay:240ms]" },
];

export function Hero() {
  return (
    <HeroSurface>
      <div className="relative grid gap-12 px-8 pt-28 pb-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
        <div className="flex flex-col pl-6">
          <h1 className="hero-title font-display text-[56px] leading-[0.98] tracking-[-0.01em] text-white md:text-[64px] lg:text-[72px]">
            {titleLines.map((line) => (
              <span key={line.text} className={`rise block ${line.delay}`}>
                {line.text}
              </span>
            ))}
          </h1>
          <p className="rise mt-6 max-w-md text-[17px] leading-[1.5] text-mist [--delay:420ms]">
            One system for planning, tracking, and shipping.
            <br />
            No more status meetings, no more lost context.
          </p>
          <div className="rise mt-14 flex flex-wrap gap-3 [--delay:560ms]">
            <Button tone="metal">Start for free</Button>
            <Button tone="dark">Watch demo</Button>
          </div>
          <div className="rise mt-auto flex flex-wrap gap-6 pt-28 [--delay:800ms]">
            {awards.map((award) => (
              <Laurel key={award.title} {...award} />
            ))}
          </div>
        </div>
        <div className="slide-in h-[640px] lg:-mr-8 lg:-mb-10 lg:translate-x-6">
          <TaskBoard />
        </div>
      </div>
    </HeroSurface>
  );
}
