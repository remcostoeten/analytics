"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";

type Props = { label: string; children: ReactNode };

function tabOf(target: EventTarget | null) {
  return target instanceof Element ? target.closest<HTMLElement>(".tab") : null;
}

function place(nav: HTMLElement, tab: HTMLElement | null) {
  if (!tab) {
    nav.removeAttribute("data-shown");
    return;
  }
  const bounds = nav.getBoundingClientRect();
  const box = tab.getBoundingClientRect();
  const left = box.left - bounds.left;
  const previous = Number.parseFloat(nav.style.getPropertyValue("--tab-left"));
  if (!Number.isNaN(previous) && previous !== left) {
    nav.dataset.direction = left > previous ? "forward" : "back";
  }
  nav.style.setProperty("--tab-left", `${left}px`);
  nav.style.setProperty("--tab-right", `${bounds.right - box.right}px`);
  nav.style.setProperty("--tab-top", `${box.bottom - bounds.top - 2}px`);
  nav.dataset.shown = "true";
}

export function Tabs({ label, children }: Props) {
  const nav = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const root = nav.current;
    if (root) place(root, root.querySelector<HTMLElement>('.tab[aria-current="page"]'));
  });

  useEffect(() => {
    const root = nav.current;
    if (!root) return;
    const frame = requestAnimationFrame(() => {
      root.dataset.ready = "true";
    });
    const observer = new ResizeObserver(() => {
      place(root, root.querySelector<HTMLElement>('.tab[aria-current="page"]'));
    });
    observer.observe(root);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  function current() {
    return nav.current?.querySelector<HTMLElement>('.tab[aria-current="page"]') ?? null;
  }

  return (
    <nav
      ref={nav}
      aria-label={label}
      className="tabs"
      onPointerOver={(event) => {
        const tab = tabOf(event.target);
        if (tab && nav.current && event.pointerType !== "touch") place(nav.current, tab);
      }}
      onPointerLeave={() => {
        if (nav.current) place(nav.current, current());
      }}
      onFocus={(event) => {
        const tab = tabOf(event.target);
        if (tab && nav.current && tab.matches(":focus-visible")) place(nav.current, tab);
      }}
      onBlur={() => {
        if (nav.current) place(nav.current, current());
      }}
    >
      {children}
    </nav>
  );
}
