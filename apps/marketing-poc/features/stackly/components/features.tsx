import type { Feature } from "../content";
import { features } from "../content";
import {
  CardsFigure,
  FocusFigure,
  StackFigure,
  TimelineFigure,
  ToolbarFigure,
} from "./feature-figures";
import { Dim, Eyebrow, Heading } from "./primitives";

function Figure({ figure }: { figure: Feature["figure"] }) {
  if (figure === "timeline") return <TimelineFigure />;
  if (figure === "focus") return <FocusFigure />;
  if (figure === "cards") return <CardsFigure />;
  if (figure === "toolbar") return <ToolbarFigure />;
  return <StackFigure />;
}

function Card({ feature }: { feature: Feature }) {
  const tall = feature.figure === "toolbar";
  return (
    <li
      className={`flex flex-col border border-line-strong bg-ink-deep ${tall ? "lg:col-start-2 lg:row-span-2 lg:row-start-1" : ""}`}
    >
      <div className={`relative overflow-hidden ${tall ? "flex-1" : "h-[270px]"}`}>
        <Figure figure={feature.figure} />
      </div>
      <div className="px-5 pt-3 pb-6">
        <p className="text-[13px] text-paper">{feature.name}</p>
        <p className="mt-1.5 text-[11.5px] leading-[1.6] text-fog">{feature.note}</p>
      </div>
    </li>
  );
}

export function Features() {
  return (
    <section className="px-8 py-24">
      <div className="mx-auto max-w-[1180px]">
        <Eyebrow centered>Our features</Eyebrow>
        <div className="mt-3">
          <Heading centered size="md">
            <Dim>Plan in minutes.</Dim> Adjust in seconds. <Dim>Ship</Dim>
            <br />
            with confidence <Dim>at any scale.</Dim>
          </Heading>
        </div>
        <ul className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
          {features.map((feature) => (
            <Card key={feature.name} feature={feature} />
          ))}
        </ul>
      </div>
    </section>
  );
}
