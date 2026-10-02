"use client";

import type { PointerEvent, ReactNode } from "react";
import { useRef } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  strength?: number;
  glare?: boolean;
};

export function Tilt({ children, className = "", strength = 6, glare = true }: Props) {
  const box = useRef<HTMLDivElement>(null);

  function move(event: PointerEvent<HTMLDivElement>) {
    const element = box.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    element.style.setProperty("--rx", `${(-y * strength).toFixed(2)}deg`);
    element.style.setProperty("--ry", `${(x * strength).toFixed(2)}deg`);
    element.style.setProperty("--gx", `${((x + 0.5) * 100).toFixed(1)}%`);
    element.style.setProperty("--gy", `${((y + 0.5) * 100).toFixed(1)}%`);
  }

  function reset() {
    const element = box.current;
    if (!element) return;
    element.style.setProperty("--rx", "0deg");
    element.style.setProperty("--ry", "0deg");
  }

  return (
    <div ref={box} className={`tilt ${className}`} onPointerMove={move} onPointerLeave={reset}>
      {children}
      {glare ? <span className="tilt-glare pointer-events-none absolute inset-0" /> : null}
    </div>
  );
}
