import { DotMap } from "./figures";
import { Eyebrow, Heading, Window } from "./primitives";

function Callout({
  label,
  children,
  className = "",
}: {
  label: string;
  children: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="eyebrow flex items-center gap-2 text-ember">
        <span aria-hidden>▸</span>
        {label}
      </p>
      <p className="mt-4 font-mono text-[11px] leading-relaxed text-mist">{children}</p>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <Eyebrow centered>How it works</Eyebrow>
      <div className="mt-4">
        <Heading centered>
          Every update lands where
          <br />
          your team can see it
        </Heading>
      </div>
      <p className="mx-auto mt-5 max-w-md text-center text-mist">
        Plans change. Priorities shift. Stackly keeps the whole team looking at the same picture,
        automatically.
      </p>
      <div className="mt-16 grid items-center gap-10 lg:grid-cols-[1fr_2.4fr_1fr]">
        <Callout label="Shared view">
          Every teammate opens the same board, the same priorities, the same picture. Nothing gets
          buried in a private inbox or forgotten in a side chat.
        </Callout>
        <Window title="Evolution · Secure">
          <div className="relative h-72 bg-ink">
            <DotMap />
            <div className="absolute top-12 right-12 border border-line bg-ink-raised px-3 py-2">
              <p className="eyebrow text-ember">Address verification</p>
              <p className="mt-1 text-[10px] text-fog">742 Evergreen Terrace, Springfield</p>
            </div>
            <div className="absolute bottom-10 left-10 flex items-center gap-4 border border-line bg-ink-raised px-3 py-2">
              <span>
                <p className="eyebrow text-ember">Face match</p>
                <p className="mt-1 text-[10px] text-fog">Liveness check passed</p>
              </span>
              <span className="font-display text-2xl text-paper">98%</span>
            </div>
          </div>
          <p className="eyebrow border-t border-line px-4 py-2.5 text-fog">
            Facial match: <span className="text-emerald-500">on</span> · Document auth:{" "}
            <span className="text-emerald-500">on</span>
          </p>
        </Window>
        <Callout label="Auto-updated" className="lg:self-end">
          Merge a branch and the ticket moves itself. No one types "done", the work reports its own
          progress the moment it actually happens.
        </Callout>
      </div>
    </section>
  );
}
