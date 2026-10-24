"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { InfoIcon } from "./icons";

type Props = { children: string; label?: string };

const edge = 8;

export function Tip({ children, label = "More information" }: Props) {
  const id = useId();
  const root = useRef<HTMLSpanElement>(null);
  const bubble = useRef<HTMLSpanElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [shift, setShift] = useState(0);
  const open = hovered || focused || pinned;

  useLayoutEffect(() => {
    if (!open || !bubble.current) return;
    const box = bubble.current.getBoundingClientRect();
    const current = shift;
    const left = box.left - current;
    const right = box.right - current;
    const over = Math.max(0, edge - left) - Math.max(0, right - (window.innerWidth - edge));
    setShift(over);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setHovered(false);
      setFocused(false);
      setPinned(false);
    }
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setPinned(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <span
      ref={root}
      className="tip"
      onPointerEnter={(event) => event.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <button
        type="button"
        className="tip-trigger"
        aria-label={label}
        aria-describedby={id}
        aria-expanded={open}
        onFocus={(event) => setFocused(event.currentTarget.matches(":focus-visible"))}
        onBlur={() => setFocused(false)}
        onClick={(event) => {
          event.preventDefault();
          setPinned((value) => !value);
        }}
      >
        <InfoIcon className="size-3.5" />
      </button>
      <span
        ref={bubble}
        role="tooltip"
        id={id}
        className="tip-bubble"
        data-open={open}
        style={{ "--tip-shift": `${shift}px` } as CSSProperties}
      >
        {children}
      </span>
    </span>
  );
}
