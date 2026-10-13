"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";

import { ChevronIcon } from "./icons";

type Props = {
  count: number;
  children: ReactNode;
};

type Edges = { start: boolean; end: boolean };

type Drag = { pointer: number; startX: number; startLeft: number; moved: boolean };

const perPage = 3;
const dragThreshold = 6;

export function ProjectCarousel({ count, children }: Props) {
  const track = useRef<HTMLUListElement>(null);
  const drag = useRef<Drag | null>(null);
  const [edges, setEdges] = useState<Edges>({ start: true, end: count <= perPage });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const node = track.current;
    if (!node) return;
    function measure() {
      if (!node) return;
      const max = node.scrollWidth - node.clientWidth;
      setEdges({ start: node.scrollLeft <= 1, end: node.scrollLeft >= max - 1 });
    }
    measure();
    node.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => {
      node.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, []);

  function page(direction: -1 | 1) {
    const node = track.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollBy({ left: direction * node.clientWidth, behavior: reduced ? "auto" : "smooth" });
  }

  function onPointerDown(event: PointerEvent<HTMLUListElement>) {
    const node = track.current;
    if (!node || event.pointerType !== "mouse" || event.button !== 0) return;
    drag.current = {
      pointer: event.pointerId,
      startX: event.clientX,
      startLeft: node.scrollLeft,
      moved: false,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLUListElement>) {
    const node = track.current;
    const current = drag.current;
    if (!node || !current || current.pointer !== event.pointerId) return;
    const delta = event.clientX - current.startX;
    if (!current.moved && Math.abs(delta) < dragThreshold) return;
    if (!current.moved) {
      current.moved = true;
      node.setPointerCapture(event.pointerId);
      setDragging(true);
    }
    node.scrollLeft = current.startLeft - delta;
  }

  function onPointerUp(event: PointerEvent<HTMLUListElement>) {
    const node = track.current;
    const current = drag.current;
    if (!node || !current || current.pointer !== event.pointerId) return;
    if (current.moved && node.hasPointerCapture(event.pointerId)) {
      node.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
    if (!current.moved) drag.current = null;
  }

  function onClickCapture(event: MouseEvent<HTMLUListElement>) {
    const current = drag.current;
    if (!current?.moved) return;
    event.preventDefault();
    event.stopPropagation();
    drag.current = null;
  }

  return (
    <div className="relative">
      <ul
        ref={track}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
        className={`project-track -mx-2 flex gap-4 overflow-x-auto px-2 py-6 -my-6 scroll-px-2 ${dragging ? "cursor-grabbing snap-none select-none" : "snap-x snap-mandatory"} ${count > perPage ? "cursor-grab" : ""}`}
      >
        {children}
      </ul>
      {count > perPage ? (
        <div className="mt-6 flex items-center justify-end gap-2">
          <CarouselButton label="Previous projects" disabled={edges.start} onClick={() => page(-1)}>
            <ChevronIcon className="size-4 rotate-90" />
          </CarouselButton>
          <CarouselButton label="Next projects" disabled={edges.end} onClick={() => page(1)}>
            <ChevronIcon className="size-4 -rotate-90" />
          </CarouselButton>
        </div>
      ) : null}
    </div>
  );
}

type ButtonProps = {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
};

function CarouselButton({ label, disabled, onClick, children }: ButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-9 items-center justify-center rounded-full border border-line bg-surface text-fg transition-[color,border-color,opacity] duration-200 hover:border-fg/40 disabled:cursor-default disabled:opacity-35 disabled:hover:border-line"
    >
      {children}
    </button>
  );
}
