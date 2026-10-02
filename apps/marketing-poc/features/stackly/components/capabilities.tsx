import type { Capability } from "../content";
import { capabilities } from "../content";
import {
  DependencyFigure,
  RelationshipFigure,
  TeamMapFigure,
  WorkloadFigure,
} from "./capability-figures";
import { Dim, Eyebrow, Heading } from "./primitives";

function Figure({ figure }: { figure: Capability["figure"] }) {
  if (figure === "dependencies") return <DependencyFigure />;
  if (figure === "map") return <TeamMapFigure />;
  if (figure === "relationships") return <RelationshipFigure />;
  return <WorkloadFigure />;
}

export function Capabilities() {
  return (
    <section className="px-8 py-24">
      <div className="mx-auto max-w-[1180px]">
        <Eyebrow>Capabilities</Eyebrow>
        <div className="mt-3 max-w-2xl">
          <Heading size="md">
            <Dim>Manage every project</Dim> without
            <br />
            <Dim>losing track</Dim> of what actually matters
          </Heading>
        </div>
        <ul className="mt-14 grid border-t border-l border-line-strong sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((capability) => (
            <li
              key={capability.name}
              className="flex flex-col border-r border-b border-line-strong px-6 pt-6 pb-7"
            >
              <p className="flex items-center gap-2 text-[13px] text-paper">
                <span className="text-[8px] text-ember" aria-hidden>
                  ▶
                </span>
                {capability.name}
              </p>
              <div className="my-6 h-[150px]">
                <Figure figure={capability.figure} />
              </div>
              <p className="mt-auto text-[11.5px] leading-[1.6] text-fog">{capability.note}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
