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
import { Reveal } from "./reveal";
import { Tilt } from "./tilt";

function Figure({ figure }: { figure: Feature["figure"] }) {
  if (figure === "timeline") return <TimelineFigure />;
  if (figure === "focus") return <FocusFigure />;
  if (figure === "cards") return <CardsFigure />;
  if (figure === "toolbar") return <ToolbarFigure />;
  return <StackFigure />;
}

function Card({ feature, index }: { feature: Feature; index: number }) {
  const tall = feature.figure === "toolbar";
  return (
    <li className={tall ? "lg:col-start-2 lg:row-span-2 lg:row-start-1" : ""}>
      <Reveal delay={index * 80} className="h-full">
        <Tilt
          className="card lift flex h-full flex-col border border-line-strong bg-ink-deep"
          strength={3}
        >
          <div
            className={`relative overflow-hidden ${tall ? "min-h-[560px] flex-1" : "h-[270px]"}`}
          >
            <Figure figure={feature.figure} />
          </div>
          <div className="px-5 pt-3 pb-6">
            <p className="text-[13px] text-paper">{feature.name}</p>
            <p className="mt-1.5 text-[11.5px] leading-[1.6] text-fog">{feature.note}</p>
          </div>
        </Tilt>
      </Reveal>
    </li>
  );
}

export function Features() {
  return (
    <section id="build" className="px-8 py-24">
      <div className="mx-auto max-w-[1180px]">
        <Reveal>
          <Eyebrow centered>Our features</Eyebrow>
          <div className="mt-3">
            <Heading centered size="md">
              <Dim>Plan in minutes.</Dim> Adjust in seconds. <Dim>Ship</Dim>
              <br />
              with confidence <Dim>at any scale.</Dim>
            </Heading>
          </div>
        </Reveal>
        <ul className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2">
          {features.map((feature, index) => (
            <Card key={feature.name} feature={feature} index={index} />
          ))}
        </ul>
      </div>
    </section>
  );
}
