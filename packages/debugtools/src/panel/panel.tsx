import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";

import { Icon } from "../icons";
import type { IconName } from "../icons";
import type { ConsoleTheme } from "../types";
import { defaultLayout, fitLayout, readLayout, saveLayout } from "./layout";
import type { PanelLayout, PanelMode, PanelRect } from "./layout";

type Props = {
  label: string;
  theme: ConsoleTheme;
  onClose: () => void;
  children: ReactNode;
};

type Move = (deltaX: number, deltaY: number) => void;

const focusClass =
  "focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-console-muted";
const controlClass = `grid size-6 place-items-center rounded-[5px] text-console-dim hover:bg-console-hover hover:text-console-fg ${focusClass}`;

function viewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

function storage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function track(event: ReactPointerEvent, move: Move) {
  if (event.button !== 0) return;
  event.preventDefault();
  const startX = event.clientX;
  const startY = event.clientY;
  function onMove(next: PointerEvent) {
    move(next.clientX - startX, next.clientY - startY);
  }
  function onUp() {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  }
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
}

function placement(layout: PanelLayout): CSSProperties {
  if (layout.mode === "maximized") return { inset: 0 };
  if (layout.mode === "docked")
    return { left: 0, right: 0, bottom: 0, height: layout.dockedHeight };
  const { x, y, width, height } = layout.floating;
  return { left: x, top: y, width, height };
}

export function Panel({ label, theme, onClose, children }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<PanelLayout>(() => {
    const saved = storage();
    return fitLayout(saved ? readLayout(saved) : defaultLayout, viewport());
  });

  useEffect(() => {
    root.current?.focus();
  }, []);

  useEffect(() => {
    const saved = storage();
    if (saved) saveLayout(saved, layout);
  }, [layout]);

  useEffect(() => {
    function onResize() {
      setLayout((current) => fitLayout(current, viewport()));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function setMode(mode: PanelMode) {
    setLayout((current) => ({ ...current, mode }));
  }

  function resizeDock(event: ReactPointerEvent) {
    const start = layout.dockedHeight;
    track(event, (_, deltaY) =>
      setLayout((current) => fitLayout({ ...current, dockedHeight: start - deltaY }, viewport())),
    );
  }

  function moveFloating(event: ReactPointerEvent) {
    if (layout.mode !== "floating") return;
    const start: PanelRect = layout.floating;
    track(event, (deltaX, deltaY) =>
      setLayout((current) =>
        fitLayout(
          { ...current, floating: { ...start, x: start.x + deltaX, y: start.y + deltaY } },
          viewport(),
        ),
      ),
    );
  }

  function resizeFloating(event: ReactPointerEvent) {
    const start: PanelRect = layout.floating;
    track(event, (deltaX, deltaY) =>
      setLayout((current) =>
        fitLayout(
          {
            ...current,
            floating: { ...start, width: start.width + deltaX, height: start.height + deltaY },
          },
          viewport(),
        ),
      ),
    );
  }

  const floating = layout.mode === "floating";
  const maximized = layout.mode === "maximized";
  const controls: { icon: IconName; label: string; onClick: () => void; className?: string }[] = [
    floating
      ? { icon: "dock", label: "Dock to the bottom", onClick: () => setMode("docked") }
      : {
          icon: "float",
          label: "Pop out as a floating window",
          onClick: () => setMode("floating"),
          className: "max-[640px]:hidden",
        },
    maximized
      ? { icon: "restore", label: "Restore size", onClick: () => setMode("docked") }
      : { icon: "maximize", label: "Maximise", onClick: () => setMode("maximized") },
    { icon: "close", label: "Close the debug console", onClick: onClose },
  ];

  return (
    <div
      ref={root}
      tabIndex={-1}
      className={`spd fixed flex animate-console-sheet outline-none flex-col overflow-hidden border-console-line bg-console-bg font-console-sans text-[13px] text-console-fg shadow-[0_-20px_60px_-30px_var(--spc-shadow)] motion-reduce:animate-none ${floating ? "rounded-[10px] border" : maximized ? "" : "border-t"}`}
      style={placement(layout)}
      data-theme={theme}
      data-mode={layout.mode}
      role="dialog"
      aria-label="Debug console"
    >
      {layout.mode === "docked" ? (
        <div
          className="absolute inset-x-0 -top-1 z-1 h-2 cursor-ns-resize"
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize the debug console"
          onPointerDown={resizeDock}
        />
      ) : null}
      <header
        className={`flex h-8.5 flex-none items-center gap-2 border-b border-console-divider pr-1.5 pl-3 select-none ${floating ? "cursor-grab active:cursor-grabbing" : ""}`}
        onPointerDown={moveFloating}
        onDoubleClick={() => setMode(maximized ? "docked" : "maximized")}
      >
        <span className="size-1.5 rounded-full bg-console-accent" aria-hidden="true" />
        <span className="font-medium">Console</span>
        <span className="truncate font-console-mono text-xs text-console-dim">{label}</span>
        <span className="ml-auto flex gap-0.5" onPointerDown={(event) => event.stopPropagation()}>
          {controls.map((control) => (
            <button
              key={control.label}
              type="button"
              className={control.className ? `${controlClass} ${control.className}` : controlClass}
              aria-label={control.label}
              title={control.label}
              onClick={control.onClick}
            >
              <Icon name={control.icon} size={13} />
            </button>
          ))}
        </span>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
      {floating ? (
        <div
          className="absolute right-0 bottom-0 size-3.5 cursor-nwse-resize"
          role="separator"
          aria-label="Resize the floating window"
          onPointerDown={resizeFloating}
        />
      ) : null}
    </div>
  );
}
