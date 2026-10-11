"use client";

import { useEffect, useRef, useState } from "react";

import { formatMetric } from "../format";
import type { MetricFormat } from "../metrics";

type Props = { value: number; format: MetricFormat; className?: string };

const duration = 600;

function easeOut(progress: number) {
  return 1 - (1 - progress) ** 3;
}

export function AnimatedNumber({ value, format, className }: Props) {
  const [shown, setShown] = useState(value);
  const current = useRef(value);

  useEffect(() => {
    const start = current.current;
    if (start === value || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      current.current = value;
      setShown(value);
      return;
    }
    const began = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const progress = Math.min((now - began) / duration, 1);
      current.current = start + (value - start) * easeOut(progress);
      setShown(current.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const display = format === "count" ? Math.round(shown) : shown;
  return <span className={className}>{formatMetric(display, format)}</span>;
}
