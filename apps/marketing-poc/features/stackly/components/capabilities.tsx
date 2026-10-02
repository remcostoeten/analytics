import type { Capability } from "../content";
import { capabilities } from "../content";
import { DependencyFigure, DotMap, RelationshipFigure, WorkloadFigure } from "./figures";
import { Eyebrow, Heading } from "./primitives";

function Figure({ figure }: { figure: Capability["figure"] }) {
  if (figure === "dependencies") return <DependencyFigure />;
  if (figure === "map") return <DotMap compact />;
  if (figure === "relationships") return <RelationshipFigure />;
  return <WorkloadFigure />;
}

export function Capabilities() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <Eyebrow>Capabilities</Eyebrow>
      <div className="mt-4 max-w-xl">
        <Heading size="md">
          Manage every project <span className="text-mist">without</span>
          <br />
          losing track of <span className="text-mist">what actually matters</span>
        </Heading>
      </div>
      <ul className="mt-12 grid border-t border-l border-line sm:grid-cols-2 lg:grid-cols-4">
        {capabilities.map((capability) => (
          <li key={capability.name} className="flex flex-col border-r border-b border-line p-5">
            <p className="eyebrow flex items-center gap-2 text-paper">
              <span className="text-ember" aria-hidden>
                ▸
              </span>
              {capability.name}
            </p>
            <div className="my-6 h-36">
              <Figure figure={capability.figure} />
            </div>
            <p className="mt-auto text-[11px] leading-relaxed text-fog">{capability.note}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
