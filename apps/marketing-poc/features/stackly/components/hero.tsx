import { awards } from "../content";
import { Button } from "./primitives";
import { TaskBoard } from "./task-board";

function Laurel({ title, note, year }: (typeof awards)[number]) {
  return (
    <div className="flex items-center gap-1 text-mist">
      <span className="font-display text-2xl text-fog">{"{"}</span>
      <div className="w-24 text-center">
        <p className="eyebrow text-paper">{title}</p>
        <p className="text-[8px] uppercase leading-tight text-fog">{note}</p>
        <p className="eyebrow mt-0.5 text-ember">{year}</p>
      </div>
      <span className="font-display text-2xl text-fog">{"}"}</span>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="dot-grid dot-fade pointer-events-none absolute inset-x-0 top-0 h-[60%]" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-6 pt-20 pb-16 lg:grid-cols-[1fr_1.1fr] lg:gap-8">
        <div className="flex flex-col">
          <h1 className="font-display text-5xl leading-[1.02] tracking-tight text-paper md:text-6xl lg:text-7xl">
            Turn Scattered Tasks
            <br />
            Into Shipped
            <br />
            Software
          </h1>
          <p className="mt-6 max-w-md text-base text-mist">
            One system for planning, tracking, and shipping.
            <br />
            No more status meetings, no more lost context.
          </p>
          <div className="mt-12 flex flex-wrap gap-3">
            <Button tone="light">Start for free</Button>
            <Button tone="dark">Watch demo</Button>
          </div>
          <div className="mt-auto flex flex-wrap gap-6 pt-24">
            {awards.map((award) => (
              <Laurel key={award.title} {...award} />
            ))}
          </div>
        </div>
        <div className="h-[560px] lg:translate-x-8">
          <TaskBoard />
        </div>
      </div>
    </section>
  );
}
