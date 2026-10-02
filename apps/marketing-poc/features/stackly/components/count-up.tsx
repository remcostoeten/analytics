"use client";

import { useEffect, useRef, useState } from "react";

import { useInView } from "../hooks/use-in-view";

type Props = {
  to: number;
  suffix?: string;
  duration?: number;
  className?: string;
};

export function CountUp({ to, suffix = "", duration = 1400, className = "" }: Props) {
  const target = useRef<HTMLSpanElement>(null);
  const inView = useInView(target, 0.6);
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let frame = 0;
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(to * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, to, duration]);

  return (
    <span ref={target} className={className}>
      {value}
      {suffix}
    </span>
  );
}
