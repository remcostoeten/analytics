"use client";

import type { PointerEvent, ReactNode } from "react";
import { useRef } from "react";

type Props = {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  pressed?: boolean;
};

export function Magnetic({ children, className = "", onClick, pressed = false }: Props) {
  const box = useRef<HTMLButtonElement>(null);

  function move(event: PointerEvent<HTMLButtonElement>) {
    const element = box.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    const x = event.clientX - bounds.left - bounds.width / 2;
    const y = event.clientY - bounds.top - bounds.height / 2;
    element.style.transform = `translate(${(x * 0.18).toFixed(1)}px, ${(y * 0.25).toFixed(1)}px)`;
  }

  function reset() {
    const element = box.current;
    if (!element) return;
    element.style.transform = "";
  }

  return (
    <button
      ref={box}
      type="button"
      aria-pressed={pressed}
      className={`magnetic ${className}`}
      onPointerMove={move}
      onPointerLeave={reset}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
