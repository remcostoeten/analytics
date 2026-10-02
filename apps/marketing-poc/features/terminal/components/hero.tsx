"use client";

import { useScramble } from "../hooks/use-scramble";
import { Terminal } from "./terminal";

function Word({ text, italic = false }: { text: string; italic?: boolean }) {
  const { output, play } = useScramble(text, 22);
  return (
    <span
      onPointerEnter={play}
      className={`inline-block cursor-default ${italic ? "font-display italic text-[#d8ff3a]" : ""}`}
    >
      {output}
    </span>
  );
}

export function Hero() {
  return (
    <section className="grid-overlay relative grid min-h-[calc(100vh-49px)] grid-cols-1 border-b border-[#2a2a2e] lg:grid-cols-[1.15fr_1fr]">
      <div className="flex flex-col justify-between border-[#2a2a2e] p-8 lg:border-r lg:p-12">
        <p className="mono text-[11px] tracking-[0.2em] text-[#5a5a60] uppercase">
          <span className="text-[#d8ff3a]">▌</span> Project management, from the branch
        </p>
        <h1 className="font-display my-12 text-[64px] leading-[0.92] tracking-[-0.02em] text-[#f2f1ed] md:text-[96px] lg:text-[128px]">
          <Word text="Plans" /> <Word text="change." />
          <br />
          <Word text="Ship" italic /> <Word text="anyway." />
        </h1>
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <p className="max-w-md text-[16px] leading-[1.6] text-[#9a9a9f]">
            Stackly reads your branches and moves the tickets itself. One board, one log, and a
            terminal that answers the question the status meeting was for.
          </p>
          <div className="flex gap-px">
            <button
              type="button"
              className="group mono flex items-center gap-3 bg-[#f2f1ed] px-6 py-4 text-[11px] tracking-[0.2em] text-[#070708] uppercase transition-colors hover:bg-[#d8ff3a]"
            >
              Start free
              <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
            </button>
            <button
              type="button"
              className="mono border border-[#2a2a2e] px-6 py-4 text-[11px] tracking-[0.2em] text-[#f2f1ed] uppercase transition-colors hover:border-[#f2f1ed]"
            >
              Read the docs
            </button>
          </div>
        </div>
      </div>
      <div className="relative p-8 lg:p-12">
        <div className="absolute top-4 right-6 mono text-[10px] tracking-[0.2em] text-[#5a5a60] uppercase">
          fig. 01 · live
        </div>
        <div className="h-[420px] lg:h-full">
          <Terminal />
        </div>
      </div>
    </section>
  );
}
