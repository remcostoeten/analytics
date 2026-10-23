"use client";

import { useEffect, useRef, type PointerEvent, type ReactNode, type MouseEvent } from "react";

type Props = {
  label: string;
  children: ReactNode;
};

type Drag = {
  pointer: number;
  startX: number;
  startScroll: number;
  lastX: number;
  lastTime: number;
  velocity: number;
  moved: boolean;
};

const dragThreshold = 5;
const friction = 0.95;
const overshootLimit = 90;
const stiffness = 220;
const damping = 19;

function rubberBand(distance: number) {
  // Apple's rubber-band curve: resistance grows with distance and never passes the limit.
  return (1 - 1 / ((Math.abs(distance) * 0.55) / overshootLimit + 1)) * overshootLimit;
}

function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function DragStrip({ label, children }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const offset = useRef(0);
  const frame = useRef(0);
  const suppressClick = useRef(false);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  function setOffset(value: number) {
    offset.current = value;
    if (track.current) {
      track.current.style.transform = value === 0 ? "" : `translate3d(${value}px, 0, 0)`;
    }
  }

  function stop() {
    cancelAnimationFrame(frame.current);
  }

  function springBack(startVelocity: number) {
    let velocity = startVelocity;
    let last = performance.now();
    function step(now: number) {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      velocity += (-stiffness * offset.current - damping * velocity) * dt;
      const next = offset.current + velocity * dt;
      if (Math.abs(next) < 0.3 && Math.abs(velocity) < 8) {
        setOffset(0);
        return;
      }
      setOffset(next);
      frame.current = requestAnimationFrame(step);
    }
    frame.current = requestAnimationFrame(step);
  }

  function glide(startVelocity: number) {
    const element = viewport.current;
    if (!element) return;
    let velocity = startVelocity;
    let position = element.scrollLeft;
    let last = performance.now();
    function step(now: number) {
      if (!element) return;
      const dt = Math.min(32, now - last);
      last = now;
      const max = element.scrollWidth - element.clientWidth;
      position += velocity * dt;
      velocity *= friction ** (dt / 16);
      if (position < 0 || position > max) {
        element.scrollLeft = position < 0 ? 0 : max;
        springBack(Math.max(-2400, Math.min(2400, -velocity * 1000)));
        return;
      }
      element.scrollLeft = position;
      if (Math.abs(velocity) < 0.02) return;
      frame.current = requestAnimationFrame(step);
    }
    frame.current = requestAnimationFrame(step);
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || event.button !== 0 || !viewport.current) return;
    stop();
    drag.current = {
      pointer: event.pointerId,
      startX: event.clientX,
      startScroll: viewport.current.scrollLeft - offset.current,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
      moved: false,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    const element = viewport.current;
    if (!current || !element || current.pointer !== event.pointerId) return;
    const travelled = event.clientX - current.startX;
    if (!current.moved) {
      if (Math.abs(travelled) < dragThreshold) return;
      current.moved = true;
      element.setPointerCapture(event.pointerId);
      element.dataset.dragging = "";
    }
    const dt = Math.max(1, event.timeStamp - current.lastTime);
    const instant = -(event.clientX - current.lastX) / dt;
    current.velocity = current.velocity * 0.2 + instant * 0.8;
    current.lastX = event.clientX;
    current.lastTime = event.timeStamp;
    const max = element.scrollWidth - element.clientWidth;
    const wanted = current.startScroll - travelled;
    if (wanted < 0) {
      element.scrollLeft = 0;
      setOffset(rubberBand(wanted));
    } else if (wanted > max) {
      element.scrollLeft = max;
      setOffset(-rubberBand(wanted - max));
    } else {
      element.scrollLeft = wanted;
      setOffset(0);
    }
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    const element = viewport.current;
    if (!current || !element || current.pointer !== event.pointerId) return;
    drag.current = null;
    if (!current.moved) return;
    suppressClick.current = true;
    delete element.dataset.dragging;
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    const idle = event.timeStamp - current.lastTime > 80;
    const velocity = idle ? 0 : current.velocity;
    if (reducedMotion()) {
      setOffset(0);
      return;
    }
    if (offset.current !== 0) springBack(0);
    else if (velocity !== 0) glide(velocity);
  }

  function onClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <div
      ref={viewport}
      role="region"
      aria-label={label}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={onClickCapture}
      onDragStart={(event) => event.preventDefault()}
      onWheel={stop}
      className="drag-strip -mx-4 cursor-grab overflow-x-auto overscroll-x-contain px-4 [scrollbar-width:none] focus-visible:outline-none data-[dragging]:cursor-grabbing data-[dragging]:select-none sm:mx-0 sm:px-0"
    >
      <div ref={track} className="w-max will-change-transform">
        {children}
      </div>
    </div>
  );
}
