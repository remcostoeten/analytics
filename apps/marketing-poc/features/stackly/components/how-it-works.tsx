import { Hands } from "./hands";
import { Icon } from "./icons";
import { Callout, Dim, Eyebrow, Heading, Window } from "./primitives";

export function HowItWorks() {
  return (
    <section className="relative overflow-hidden px-8 py-24">
      <div className="dust dust-left pointer-events-none absolute top-0 left-0 h-[420px] w-[420px]" />
      <div className="dust dust-right pointer-events-none absolute top-0 right-0 h-[420px] w-[420px]" />
      <div className="relative">
        <Eyebrow centered>How it works</Eyebrow>
        <div className="mt-3">
          <Heading centered>
            <Dim>Every update</Dim> lands where
            <br />
            <Dim>your team</Dim> can see it
          </Heading>
        </div>
        <p className="mx-auto mt-5 max-w-lg text-center text-[17px] leading-[1.5] text-mist">
          Plans change. Priorities shift. Stackly keeps the whole team looking at the same picture,
          automatically.
        </p>
        <div className="mx-auto mt-16 grid max-w-[1180px] items-start gap-10 lg:grid-cols-[1fr_2.1fr_1fr]">
          <Callout label="Shared view" className="lg:mt-6">
            Every teammate opens the same board, the same priorities, the same picture. Nothing gets
            buried in a private inbox or forgotten in a side chat.
          </Callout>
          <Window title="Evolution™ · Secure">
            <div className="relative h-[330px] bg-ink-deep">
              <div className="hands-live absolute inset-0">
                <Hands />
              </div>
              <div className="corner-marks float absolute top-[26%] right-[14%] px-3 py-2">
                <p className="eyebrow flex items-center gap-1.5 text-ember">
                  <Icon name="scan" size={10} />
                  Address verification
                </p>
                <p className="mt-1 text-[10px] text-mist">742 Evergreen Terrace, Springfield</p>
              </div>
              <div className="corner-marks float float-late absolute bottom-[18%] left-[8%] flex items-center gap-5 px-3 py-2">
                <span>
                  <p className="eyebrow flex items-center gap-1.5 text-ember">
                    <span className="text-[7px]">▶</span>
                    Face match
                  </p>
                  <p className="mt-1 text-[10px] text-mist">Liveness check passed</p>
                </span>
                <span className="font-display text-[26px] text-paper">98%</span>
              </div>
            </div>
            <p className="mono border-t border-line px-4 py-3 text-[11px] tracking-wide text-fog">
              Facial Match: <span className="blink font-medium text-leaf">ON</span>
              <span className="mx-3">·</span>
              Document Auth: <span className="font-medium text-leaf">ON</span>
            </p>
          </Window>
          <Callout label="Auto-updated" className="lg:self-end lg:justify-self-end lg:pt-72">
            Merge a branch and the ticket moves itself. No one types "done", the work reports its
            own progress the moment it actually happens.
          </Callout>
        </div>
      </div>
    </section>
  );
}
