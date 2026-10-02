"use client";

import type { RefObject } from "react";
import { useEffect, useState } from "react";

export function useInView(target: RefObject<Element | null>, threshold = 0.3) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = target.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setInView(true);
      },
      { threshold },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [target, threshold]);

  return inView;
}
