import { awards } from "../content";
import { Laurel } from "./laurel";
import { Button } from "./primitives";
import { TaskBoard } from "./task-board";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="halftone pointer-events-none absolute inset-0" />
      <div className="relative grid gap-12 px-8 pt-28 pb-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
        <div className="flex flex-col pl-6">
          <h1 className="font-display text-[56px] leading-[0.98] tracking-[-0.01em] text-paper md:text-[64px] lg:text-[72px]">
            Turn Scattered Tasks
            <br />
            Into Shipped
            <br />
            Software
          </h1>
          <p className="mt-6 max-w-md text-[17px] leading-[1.5] text-mist">
            One system for planning, tracking, and shipping.
            <br />
            No more status meetings, no more lost context.
          </p>
          <div className="mt-14 flex flex-wrap gap-3">
            <Button tone="metal">Start for free</Button>
            <Button tone="dark">Watch demo</Button>
          </div>
          <div className="mt-auto flex flex-wrap gap-6 pt-28">
            {awards.map((award) => (
              <Laurel key={award.title} {...award} />
            ))}
          </div>
        </div>
        <div className="h-[640px] lg:-mr-8 lg:-mb-10 lg:translate-x-6">
          <TaskBoard />
        </div>
      </div>
    </section>
  );
}
