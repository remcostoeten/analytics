"use client";

import { useEffect, useRef, useState } from "react";

import { formatCount } from "@/lib/format";

type Props = {
  value: number;
  className?: string;
};

const durationMs = 1100;

function easeOut(t: number) {
  return 1 - (1 - t) ** 4;
}

export function CountUp({ value, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  const current = useRef(value);
  const revealed = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current.current = value;
      setShown(value);
      return;
    }
    let frame = 0;
    function run(from: number) {
      const start = performance.now();
      function step(now: number) {
        const progress = Math.min(1, (now - start) / durationMs);
        const next = Math.round(from + easeOut(progress) * (value - from));
        current.current = next;
        setShown(next);
        if (progress < 1) frame = window.requestAnimationFrame(step);
      }
      frame = window.requestAnimationFrame(step);
    }
    if (revealed.current) {
      if (current.current !== value) run(current.current);
      return () => window.cancelAnimationFrame(frame);
    }
    if (value === 0) {
      revealed.current = true;
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      revealed.current = true;
      run(0);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {formatCount(shown)}
    </span>
  );
}
