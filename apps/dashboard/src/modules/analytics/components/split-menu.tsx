"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

type Option = { label: string; href: string; active: boolean };

type Props = { options: Option[] };

export function SplitMenu({ options }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const active = options.find((option) => option.active);

  useEffect(() => {
    if (!open) return;
    function closeOutside(event: PointerEvent) {
      if (event.target instanceof Node && root.current?.contains(event.target)) return;
      setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-current={active ? "page" : undefined}
        aria-label={active ? undefined : "More splits"}
        className="tab"
        onClick={() => setOpen((value) => !value)}
      >
        {active ? active.label : "…"}
      </button>
      {open ? (
        <ul
          id={id}
          className="popover absolute top-[calc(100%+6px)] left-0 z-20 grid w-48 gap-0.5 p-1"
        >
          {options.map((option) => (
            <li key={option.label}>
              <Link
                href={option.href}
                aria-current={option.active ? "page" : undefined}
                className="menu-item"
                scroll={false}

                onClick={() => setOpen(false)}
              >
                {option.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
