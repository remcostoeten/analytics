"use client";

import type { PointerEvent, ReactNode } from "react";
import { useRef } from "react";

type Props = {
  children: ReactNode;
};

export function HeroSurface({ children }: Props) {
  const surface = useRef<HTMLElement>(null);

  function track(event: PointerEvent<HTMLElement>) {
    const element = surface.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    element.style.setProperty("--mx", `${event.clientX - bounds.left}px`);
    element.style.setProperty("--my", `${event.clientY - bounds.top}px`);
  }

  return (
    <section
      ref={surface}
      data-hero
      className="hero-surface relative overflow-hidden"
      onPointerMove={track}
    >
      <div className="halftone pointer-events-none absolute inset-0" />
      <div className="halftone-spot pointer-events-none absolute inset-0" />
      <div className="hero-glow pointer-events-none absolute inset-0" />
      <div className="hero-shade pointer-events-none absolute inset-0" />
      {children}
    </section>
  );
}
