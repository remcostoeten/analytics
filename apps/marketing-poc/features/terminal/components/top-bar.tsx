"use client";

import { useClock } from "../hooks/use-clock";
import { useScramble } from "../hooks/use-scramble";

const links = ["Product", "Index", "Pricing", "Docs"];

function ScrambleLink({ text }: { text: string }) {
  const { output, play } = useScramble(text);
  return (
    <button
      type="button"
      onPointerEnter={play}
      className="mono text-[11px] tracking-[0.18em] text-[#9a9a9f] uppercase hover:text-[#f2f1ed]"
    >
      {output}
    </button>
  );
}

export function TopBar() {
  const clock = useClock();
  return (
    <header className="sticky top-0 z-40 grid grid-cols-[1fr_auto_1fr] items-center border-b border-[#2a2a2e] bg-[#070708]/90 px-6 py-3 backdrop-blur">
      <span className="mono flex items-center gap-3 text-[11px] tracking-[0.18em] text-[#f2f1ed] uppercase">
        <span className="inline-block size-2 bg-[#d8ff3a]" />
        Stackly
        <span className="hidden text-[#5a5a60] md:inline">/ v2.0 / all systems nominal</span>
      </span>
      <nav className="hidden items-center gap-8 md:flex">
        {links.map((link) => (
          <ScrambleLink key={link} text={link} />
        ))}
      </nav>
      <span className="mono justify-self-end text-[11px] tracking-[0.18em] text-[#9a9a9f] tabular-nums uppercase">
        UTC {clock}
        <span className="caret ml-1 inline-block w-[7px] bg-[#d8ff3a]">&nbsp;</span>
      </span>
    </header>
  );
}
