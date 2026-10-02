import type { Capability } from "../content";
import { capabilities } from "../content";
import {
  DependencyFigure,
  RelationshipFigure,
  TeamMapFigure,
  WorkloadFigure,
} from "./capability-figures";
import { Dim, Eyebrow, Heading } from "./primitives";
import { Reveal } from "./reveal";
import { Tilt } from "./tilt";

function Figure({ figure }: { figure: Capability["figure"] }) {
  if (figure === "dependencies") return <DependencyFigure />;
  if (figure === "map") return <TeamMapFigure />;
  if (figure === "relationships") return <RelationshipFigure />;
  return <WorkloadFigure />;
}

export function Capabilities() {
  return (
    <section id="track" className="px-8 py-24">
      <div className="mx-auto max-w-[1180px]">
        <Reveal>
          <Eyebrow>Capabilities</Eyebrow>
          <div className="mt-3 max-w-2xl">
            <Heading size="md">
              <Dim>Manage every project</Dim> without
              <br />
              <Dim>losing track</Dim> of what actually matters
            </Heading>
          </div>
        </Reveal>
        <ul className="mt-14 grid border-t border-l border-line-strong sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((capability, index) => (
            <li key={capability.name} className="border-r border-b border-line-strong">
              <Reveal delay={index * 90} className="h-full">
                <Tilt
                  className="card flex h-full flex-col px-6 pt-6 pb-7 transition-colors hover:bg-ink-raised/60"
                  strength={5}
                >
                  <p className="flex items-center gap-2 text-[13px] text-paper">
                    <span
                      className="text-[8px] text-ember transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    >
                      ▶
                    </span>
                    {capability.name}
                  </p>
                  <div className="figure-zoom my-6 h-[150px]">
                    <Figure figure={capability.figure} />
                  </div>
                  <p className="mt-auto text-[11.5px] leading-[1.6] text-fog">{capability.note}</p>
                </Tilt>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
