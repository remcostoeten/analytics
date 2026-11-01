"use client";

import { useEffect, useRef } from "react";

const targetSelector = ".nav-item, .nav-sub-item";

/**
 * @name useHoverIndicator
 * @description Moves one highlight element under whichever nav link the mouse is over, so the
 * hover glides between links instead of blinking on and off per row. The highlight appears in
 * place on the first link, follows the pointer across links and fades out when the pointer leaves
 * the nav. It tracks layout changes such as a sub menu opening or the sidebar widening.
 *
 * @example
 * const { navRef, indicatorRef } = useHoverIndicator<HTMLElement>();
 * <nav ref={navRef}><span ref={indicatorRef} className="nav-hover" />...</nav>
 */
export function useHoverIndicator<T extends HTMLElement>() {
  const navRef = useRef<T>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const nav = navRef.current;
    const indicator = indicatorRef.current;
    if (!nav || !indicator) return;
    let target: HTMLElement | null = null;

    function place() {
      if (!nav || !indicator || !target) return;
      const box = nav.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      indicator.style.setProperty("--hover-x", `${rect.left - box.left}px`);
      indicator.style.setProperty("--hover-y", `${rect.top - box.top}px`);
      indicator.style.setProperty("--hover-w", `${rect.width}px`);
      indicator.style.setProperty("--hover-h", `${rect.height}px`);
      indicator.style.setProperty("--hover-radius", getComputedStyle(target).borderRadius);
    }

    function show(next: HTMLElement) {
      if (!indicator || next === target) return;
      const entering = indicator.dataset.visible !== "true";
      target = next;
      if (entering) {
        indicator.dataset.instant = "true";
        place();
        void indicator.offsetWidth;
        delete indicator.dataset.instant;
      } else {
        place();
      }
      indicator.dataset.visible = "true";
    }

    function hide() {
      if (!indicator) return;
      target = null;
      indicator.dataset.visible = "false";
    }

    function onPointerOver(event: PointerEvent) {
      if (event.pointerType === "touch" || !(event.target instanceof Element)) return;
      const next = event.target.closest<HTMLElement>(targetSelector);
      if (next && nav?.contains(next)) show(next);
    }

    function onPointerLeave() {
      hide();
    }

    const observer = new ResizeObserver(() => place());
    observer.observe(nav);
    nav.addEventListener("pointerover", onPointerOver);
    nav.addEventListener("pointerleave", onPointerLeave);
    return () => {
      observer.disconnect();
      nav.removeEventListener("pointerover", onPointerOver);
      nav.removeEventListener("pointerleave", onPointerLeave);
    };
  }, []);

  return { navRef, indicatorRef };
}
