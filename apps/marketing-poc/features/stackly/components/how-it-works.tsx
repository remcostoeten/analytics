"use client";

import { useState } from "react";

import { AsciiHands } from "./ascii-hands";
import { CountUp } from "./count-up";
import { Icon } from "./icons";
import { Dim, Eyebrow, Heading, Window } from "./primitives";
import { Reveal } from "./reveal";

type Mode = "shared" | "auto";

const modes: { key: Mode; label: string; copy: string; title: string }[] = [
  {
    key: "shared",
    label: "Shared view",
    title: "Evolution™ · Secure",
    copy: "Every teammate opens the same board, the same priorities, the same picture. Nothing gets buried in a private inbox or forgotten in a side chat.",
  },
  {
    key: "auto",
    label: "Auto-updated",
    title: "Pipeline · Live",
    copy: 'Merge a branch and the ticket moves itself. No one types "done", the work reports its own progress the moment it actually happens.',
  },
];

const pipeline = ["Branch pushed", "Checks passed", "Merged to main", "Ticket closed"];

function ModeCallout({
  mode,
  active,
  onSelect,
  className = "",
}: {
  mode: (typeof modes)[number];
  active: boolean;
  onSelect: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      onPointerEnter={onSelect}
      data-active={active}
      className={`group block text-left transition-opacity data-[active=false]:opacity-50 hover:opacity-100 ${className}`}
    >
      <span className="flex items-center gap-2 text-[11px] font-medium tracking-[0.08em] text-ember uppercase">
        <span
          className="text-[8px] transition-transform group-data-[active=true]:rotate-90"
          aria-hidden
        >
          ▶
        </span>
        {mode.label}
      </span>
      <span className="mono mt-4 block max-w-[260px] text-[12px] leading-[1.75] text-mist">
        {mode.copy}
      </span>
    </button>
  );
}

export function HowItWorks() {
  const [mode, setMode] = useState<Mode>("shared");
  const current = modes.find((item) => item.key === mode) ?? modes[0];

  return (
    <section id="ship" className="relative overflow-hidden px-8 py-24">
      <div className="relative">
        <Reveal>
          <Eyebrow centered>How it works</Eyebrow>
          <div className="mt-3">
            <Heading centered>
              <Dim>Every update</Dim> lands where
              <br />
              <Dim>your team</Dim> can see it
            </Heading>
          </div>
          <p className="mx-auto mt-5 max-w-lg text-center text-[17px] leading-[1.5] text-mist">
            Plans change. Priorities shift. Stackly keeps the whole team looking at the same
            picture, automatically.
          </p>
        </Reveal>
        <div className="mx-auto mt-16 grid max-w-[1180px] items-start gap-10 lg:grid-cols-[1fr_2.1fr_1fr]">
          <ModeCallout
            mode={modes[0]!}
            active={mode === "shared"}
            onSelect={() => setMode("shared")}
            className="lg:mt-6"
          />
          <Reveal delay={120}>
            <Window title={current?.title ?? ""}>
              <div className="relative h-[330px] bg-ink-deep">
                <div
                  data-active={mode === "shared"}
                  className="absolute inset-0 transition-opacity duration-500 data-[active=false]:pointer-events-none data-[active=false]:opacity-0"
                >
                  <AsciiHands />
                  <div className="corner-marks float pointer-events-none absolute top-[22%] right-[10%] px-3 py-2">
                    <p className="eyebrow flex items-center gap-1.5 text-ember">
                      <Icon name="scan" size={10} />
                      Address verification
                    </p>
                    <p className="mt-1 text-[10px] text-mist">742 Evergreen Terrace, Springfield</p>
                  </div>
                  <div className="corner-marks float float-late pointer-events-none absolute bottom-[14%] left-[6%] flex items-center gap-5 px-3 py-2">
                    <span>
                      <p className="eyebrow flex items-center gap-1.5 text-ember">
                        <span className="text-[7px]">▶</span>
                        Face match
                      </p>
                      <p className="mt-1 text-[10px] text-mist">Liveness check passed</p>
                    </span>
                    <CountUp to={98} suffix="%" className="font-display text-[26px] text-paper" />
                  </div>
                </div>
                <div
                  data-active={mode === "auto"}
                  className="absolute inset-0 flex flex-col justify-center gap-3 px-10 transition-opacity duration-500 data-[active=false]:pointer-events-none data-[active=false]:opacity-0"
                >
                  {pipeline.map((label, index) => (
                    <div
                      key={label}
                      className="pipeline-step flex items-center gap-4"
                      style={{ animationDelay: `${index * 700}ms` }}
                    >
                      <span className="pipeline-dot size-2 rounded-full border border-ember" />
                      <span className="mono text-[12px] text-mist">{label}</span>
                      <span className="pipeline-line h-px flex-1 bg-line" />
                      <span className="mono text-[10px] text-fog">{`0${index + 1}`}</span>
                    </div>
                  ))}
                  <div className="corner-marks mt-6 flex items-center justify-between px-3 py-2">
                    <span className="mono text-[11px] text-mist">TICKET-1036</span>
                    <span className="ticket-flip mono text-[10px] text-leaf">DONE</span>
                  </div>
                </div>
              </div>
              <p className="mono border-t border-line px-4 py-3 text-[11px] tracking-wide text-fog">
                Facial Match: <span className="blink font-medium text-leaf">ON</span>
                <span className="mx-3">·</span>
                Document Auth: <span className="blink font-medium text-leaf">ON</span>
              </p>
            </Window>
          </Reveal>
          <ModeCallout
            mode={modes[1]!}
            active={mode === "auto"}
            onSelect={() => setMode("auto")}
            className="lg:self-end lg:justify-self-end lg:pt-72"
          />
        </div>
      </div>
    </section>
  );
}
