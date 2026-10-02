"use client";

import { useEffect, useRef, useState } from "react";

import { manifesto } from "../content";

export function Manifesto() {
  const section = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function update() {
      const element = section.current;
      if (!element) return;
      const bounds = element.getBoundingClientRect();
      const total = bounds.height - window.innerHeight * 0.4;
      const passed = Math.min(total, Math.max(0, -bounds.top + window.innerHeight * 0.3));
      setProgress(total > 0 ? passed / total : 1);
    }
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const words = manifesto.flatMap((line, lineIndex) =>
    line.split(" ").map((word) => ({ word, lineIndex })),
  );
  const lit = Math.floor(progress * words.length);
  let cursor = 0;

  return (
    <section ref={section} className="border-b border-[#2a2a2e] px-8 py-32 lg:px-12">
      <p className="mono mb-12 text-[11px] tracking-[0.2em] text-[#5a5a60] uppercase">
        <span className="text-[#d8ff3a]">▌</span> Manifesto
      </p>
      <div className="max-w-5xl">
        {manifesto.map((line) => (
          <p key={line} className="font-display mb-4 text-[36px] leading-[1.15] md:text-[56px]">
            {line.split(" ").map((word, index) => {
              const position = cursor;
              cursor += 1;
              return (
                <span
                  key={`${word}-${index}`}
                  data-lit={position < lit}
                  className="inline-block transition-colors duration-300 data-[lit=false]:text-[#2a2a2e] data-[lit=true]:text-[#f2f1ed]"
                >
                  {word}
                  {index < line.split(" ").length - 1 ? " " : ""}
                </span>
              );
            })}
          </p>
        ))}
      </div>
    </section>
  );
}
