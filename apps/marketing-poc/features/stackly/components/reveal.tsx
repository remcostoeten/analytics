"use client";

import type { ReactNode } from "react";
import { useRef } from "react";

import { useInView } from "../hooks/use-in-view";

type Props = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function Reveal({ children, className = "", delay = 0 }: Props) {
  const target = useRef<HTMLDivElement>(null);
  const inView = useInView(target, 0.2);
  return (
    <div
      ref={target}
      data-inview={inView}
      className={`reveal-block ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
