"use client";

import { useLayoutEffect } from "react";

const selector = ".reveal, .reveal-scale";

export function RevealObserver() {
  useLayoutEffect(() => {
    const root = document.querySelector<HTMLElement>(".landing");
    if (!root) return;
    const targets = [...root.querySelectorAll<HTMLElement>(selector)];
    if (!("IntersectionObserver" in window)) {
      for (const target of targets) target.dataset.shown = "instant";
      return;
    }
    const viewport = window.innerHeight;
    for (const target of targets) {
      if (target.getBoundingClientRect().top < viewport) target.dataset.shown = "instant";
    }
    root.dataset.reveal = "";
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = entry.target;
          if (!entry.isIntersecting || !(target instanceof HTMLElement)) continue;
          if (!target.dataset.shown) target.dataset.shown = "";
          observer.unobserve(target);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    for (const target of targets) {
      if (!target.dataset.shown) observer.observe(target);
    }
    return () => observer.disconnect();
  }, []);
  return null;
}
