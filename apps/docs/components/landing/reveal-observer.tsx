"use client";

import { useLayoutEffect } from "react";

const selector = ".reveal, .reveal-scale";

function isPassed(target: HTMLElement) {
  const { bottom, height } = target.getBoundingClientRect();
  return height > 0 && bottom <= 0;
}

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
    const pending = new Set(targets.filter((target) => !target.dataset.shown));
    if (pending.size === 0) return;
    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const target = entry.target;
          if (!entry.isIntersecting || !(target instanceof HTMLElement)) continue;
          if (!target.dataset.shown) target.dataset.shown = "";
          settle(target);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );

    function stop() {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    }

    function settle(target: HTMLElement) {
      pending.delete(target);
      observer.unobserve(target);
      if (pending.size === 0) stop();
    }

    function showPassed() {
      frame = 0;
      for (const target of pending) {
        if (!isPassed(target)) continue;
        target.dataset.shown = "instant";
        settle(target);
      }
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(showPassed);
    }

    for (const target of pending) observer.observe(target);
    window.addEventListener("scroll", onScroll, { passive: true });
    return stop;
  }, []);
  return null;
}
