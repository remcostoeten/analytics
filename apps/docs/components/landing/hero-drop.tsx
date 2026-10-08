import type { CSSProperties } from "react";

import { Logo } from "@/components/logo";

const traces = [
  { x: -46, y: -10, size: 9, delay: 260 },
  { x: -32, y: -7, size: 11, delay: 360 },
  { x: -18, y: -3, size: 13, delay: 460 },
];

export function HeroDrop() {
  return (
    <div aria-hidden="true" className="relative mb-7 h-10 w-10">
      {traces.map((trace) => (
        <span
          key={trace.x}
          className="hero-drop-trace absolute top-1/2 left-1/2"
          style={
            {
              width: trace.size,
              height: trace.size,
              marginTop: -trace.size / 2,
              marginLeft: -trace.size / 2,
              "--x": `${trace.x}px`,
              "--y": `${trace.y}px`,
              animationDelay: `${trace.delay}ms`,
            } as CSSProperties
          }
        >
          <Logo className="size-full" />
        </span>
      ))}
      <img src="/brand/drop-mark.webp" alt="" className="hero-drop size-full object-contain" />
    </div>
  );
}
