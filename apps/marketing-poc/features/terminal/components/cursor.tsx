"use client";

import { useEffect, useRef } from "react";

export function Crosshair() {
  const horizontal = useRef<HTMLDivElement>(null);
  const vertical = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function move(event: PointerEvent) {
      if (horizontal.current) horizontal.current.style.transform = `translateY(${event.clientY}px)`;
      if (vertical.current) vertical.current.style.transform = `translateX(${event.clientX}px)`;
      if (label.current) {
        label.current.style.transform = `translate(${event.clientX + 14}px, ${event.clientY + 14}px)`;
        label.current.textContent = `${String(event.clientX).padStart(4, "0")} ${String(event.clientY).padStart(4, "0")}`;
      }
    }
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 hidden mix-blend-difference lg:block"
      aria-hidden
    >
      <div ref={horizontal} className="absolute inset-x-0 top-0 h-px bg-white/40" />
      <div ref={vertical} className="absolute inset-y-0 left-0 w-px bg-white/40" />
      <div
        ref={label}
        className="mono absolute top-0 left-0 text-[10px] tracking-[0.2em] text-white"
      >
        0000 0000
      </div>
    </div>
  );
}
