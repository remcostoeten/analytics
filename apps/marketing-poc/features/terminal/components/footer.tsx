"use client";

import { useRef } from "react";

import { useClock } from "../hooks/use-clock";

export function Footer() {
  const word = useRef<HTMLDivElement>(null);
  const clock = useClock();

  function spread(event: React.PointerEvent<HTMLDivElement>) {
    const element = word.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    const ratio = (event.clientX - bounds.left) / bounds.width;
    element.style.letterSpacing = `${(ratio * 0.4 - 0.08).toFixed(3)}em`;
    element.style.fontVariationSettings = "normal";
  }

  function settle() {
    if (word.current) word.current.style.letterSpacing = "-0.08em";
  }

  return (
    <footer className="px-8 pt-20 pb-8 lg:px-12">
      <div className="mono grid gap-8 text-[11px] tracking-[0.2em] text-[#9a9a9f] uppercase md:grid-cols-4">
        <div>
          <p className="text-[#f2f1ed]">Stackly</p>
          <p className="mt-2 text-[#5a5a60]">Marketing POC · variant B</p>
        </div>
        <div className="space-y-2">
          {["Product", "Index", "Pricing", "Docs"].map((link) => (
            <p key={link} className="cursor-pointer hover:text-[#d8ff3a]">
              {link}
            </p>
          ))}
        </div>
        <div className="space-y-2">
          {["GitHub", "Changelog", "Status"].map((link) => (
            <p key={link} className="cursor-pointer hover:text-[#d8ff3a]">
              {link}
            </p>
          ))}
        </div>
        <div className="md:text-right">
          <p>UTC {clock}</p>
          <p className="mt-2 text-[#5a5a60]">Not a real product</p>
        </div>
      </div>
      <div
        ref={word}
        onPointerMove={spread}
        onPointerLeave={settle}
        className="font-display mt-20 cursor-crosshair text-center text-[22vw] leading-[0.8] tracking-[-0.08em] text-[#f2f1ed] transition-[letter-spacing] duration-300 select-none"
      >
        STACKLY
      </div>
    </footer>
  );
}
