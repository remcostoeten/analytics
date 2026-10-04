import { noop } from "@spoar/shared/noop";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";

import { ErrorsBuffer } from "../buffers/errors/components/errors-buffer";
import { LogsBuffer } from "../buffers/logs/components/logs-buffer";
import { SessionsBuffer } from "../buffers/sessions/components/sessions-buffer";
import { SpeedBuffer } from "../buffers/speed/components/speed-buffer";
import { StatusBuffer } from "../buffers/status/components/status-buffer";
import { VisitorsBuffer } from "../buffers/visitors/components/visitors-buffer";
import type { Link } from "../json/tree";
import { useStore } from "../store/create-store";
import { cx } from "../ui/cx";
import { percent, vitalText } from "../ui/format";
import { Icon } from "../ui/icons";
import { Statusline } from "../ui/statusline";
import { clampToViewport, layoutReducer, readLayout, saveLayout, tabs } from "./layout";
import type { Tab } from "./layout";
import type { Runtime } from "./runtime";
import { TabBar } from "./tab-bar";
import type { BufferProps, Controller, Jump } from "./types";

type Props = {
  runtime: Runtime;
};

type Drag = {
  kind: "move" | "corner" | "top";
  pointerX: number;
  pointerY: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

const minuteMs = 60_000;

const buffers: { [Name in Tab]: (props: BufferProps) => ReactNode } = {
  visitors: VisitorsBuffer,
  sessions: SessionsBuffer,
  logs: LogsBuffer,
  speed: SpeedBuffer,
  errors: ErrorsBuffer,
  status: StatusBuffer,
};

function isShortcut(event: KeyboardEvent) {
  return event.ctrlKey && event.shiftKey && (event.code === "Period" || event.key === ".");
}

function isTyping(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

export function Panel({ runtime }: Props) {
  const [layout, dispatch] = useReducer(layoutReducer, null, () =>
    clampToViewport(readLayout(), window.innerWidth, window.innerHeight),
  );
  const [instant, setInstant] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const live = useStore(runtime.live);
  const visitors = useStore(runtime.visitors);
  const sessions = useStore(runtime.sessions);
  const logs = useStore(runtime.logs);
  const speed = useStore(runtime.speed);
  const errors = useStore(runtime.errors);
  const section = useRef<HTMLElement>(null);
  const pill = useRef<HTMLButtonElement>(null);
  const filterRef = useRef<HTMLInputElement>(null);
  const controller = useRef<Controller>({ move: noop, activate: noop, menu: noop });
  const drag = useRef<Drag | null>(null);
  const knownErrors = useRef<number | null>(null);
  const open = layout.mode !== "pill";

  useEffect(() => saveLayout(layout), [layout]);

  useEffect(() => {
    runtime.setOpen(open);
    if (open) section.current?.focus({ preventScroll: true });
  }, [open]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!isShortcut(event)) return;
      event.preventDefault();
      setInstant(true);
      dispatch({ type: "toggle" });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const errorCount = live.overview?.errors ?? errors.rows.length;

  useEffect(() => {
    const previous = knownErrors.current;
    knownErrors.current = errorCount;
    if (previous !== null && errorCount > previous) {
      const added = errorCount - previous;
      setAnnouncement(`${added} new error ${added === 1 ? "group" : "groups"}`);
    }
  }, [errorCount]);

  function pick(tab: Tab, viaKeyboard: boolean) {
    setInstant(viaKeyboard);
    dispatch({ type: "tab", tab });
    if (viaKeyboard) section.current?.focus({ preventScroll: true });
  }

  function jump(target: Jump) {
    setInstant(false);
    dispatch({ type: "tab", tab: target.tab });
    const store = {
      visitors: runtime.visitors,
      sessions: runtime.sessions,
      logs: runtime.logs,
      speed: runtime.speed,
      errors: runtime.errors,
      status: null,
    }[target.tab];
    if (!store) return;
    if (target.filter !== undefined) store.dispatch({ type: "filter", text: target.filter });
    if (target.open !== undefined) {
      store.dispatch({ type: "open", id: target.open });
      if (target.tab === "visitors") runtime.loadVisitor(target.open);
    }
  }

  function follow(link: Link) {
    if (link.type === "visitor") return jump({ tab: "visitors", open: link.target });
    if (link.type === "session") return jump({ tab: "sessions", open: link.target });
    const catalog = runtime.options.catalogUrl;
    if (catalog) {
      window.open(catalog.replace("{code}", encodeURIComponent(link.target)), "_blank", "noopener");
      return;
    }
    jump({ tab: "logs", filter: `code:${link.target}` });
  }

  function collapse(viaKeyboard: boolean) {
    setInstant(viaKeyboard);
    dispatch({ type: "mode", mode: "pill" });
    requestAnimationFrame(() => pill.current?.focus({ preventScroll: true }));
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (isTyping(event.target)) return;
    const role = event.target instanceof HTMLElement ? event.target.getAttribute("role") : null;
    if ((event.shiftKey && event.key === "F10") || event.key === "ContextMenu") {
      event.preventDefault();
      controller.current.menu();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const index = Number(event.key) - 1;
    const numbered = tabs[index];
    if (numbered && event.key.length === 1) {
      pick(numbered, true);
      return;
    }
    if (role === "tab" && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      const step = event.key === "ArrowRight" ? 1 : -1;
      const next = tabs[(tabs.indexOf(layout.tab) + step + tabs.length) % tabs.length];
      if (next) pick(next, true);
      event.preventDefault();
      return;
    }
    if (event.key === "j" || event.key === "ArrowDown") {
      event.preventDefault();
      controller.current.move(1);
    } else if (event.key === "k" || event.key === "ArrowUp") {
      event.preventDefault();
      controller.current.move(-1);
    } else if (event.key === "Enter" && !(event.target instanceof HTMLButtonElement)) {
      controller.current.activate();
    } else if (event.key === "/") {
      event.preventDefault();
      filterRef.current?.focus();
    } else if (event.key === "Escape") {
      collapse(true);
    }
  }

  function startDrag(kind: Drag["kind"], event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    if (kind === "move" && event.target instanceof Element && event.target.closest("button"))
      return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      kind,
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: layout.x,
      y: layout.y,
      width: layout.width,
      height: layout.height,
    };
    setDragging(true);
  }

  function moveDrag(event: ReactPointerEvent<HTMLElement>) {
    const start = drag.current;
    if (!start) return;
    const dx = event.clientX - start.pointerX;
    const dy = event.clientY - start.pointerY;
    if (start.kind === "top") {
      dispatch({ type: "dock-height", height: window.innerHeight - event.clientY });
    } else if (start.kind === "move") {
      const x = Math.min(Math.max(0, start.x - dx), window.innerWidth - layout.width);
      const y = Math.min(Math.max(0, start.y - dy), window.innerHeight - layout.height);
      dispatch({ type: "move", x, y });
    } else {
      dispatch({ type: "resize", width: start.width - dx, height: start.height - dy });
    }
  }

  function endDrag(event: ReactPointerEvent<HTMLElement>) {
    if (!drag.current) return;
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const dragHandlers = { onPointerMove: moveDrag, onPointerUp: endDrag, onPointerCancel: endDrag };
  const online = live.overview?.online ?? visitors.rows.length;
  const now = Date.now();
  const recent = live.seen.filter((at) => now - at < minuteMs).length;
  const views = recent > 0 ? recent : (live.overview?.viewsPerMinute.at(-1) ?? 0);
  const streamMode = logs.held ? "paused" : live.logs === "polling" ? "poll" : live.logs;
  const counts = useMemo(
    () => ({
      visitors: String(visitors.rows.length),
      sessions: String(sessions.rows.length),
      logs: String(logs.rows.length),
      speed: String(speed.rows.length),
      errors: String(errors.rows.length),
      status: "",
    }),
    [visitors.rows, sessions.rows, logs.rows, speed.rows, errors.rows],
  );
  const Buffer = buffers[layout.tab];
  const float = layout.mode === "float";
  const geometry = float
    ? {
        right: layout.wide ? 16 : layout.x,
        bottom: layout.tall ? 16 : layout.y,
        width: layout.wide ? undefined : layout.width,
        height: layout.tall ? undefined : layout.height,
        left: layout.wide ? 16 : undefined,
        top: layout.tall ? 16 : undefined,
      }
    : { height: layout.tall ? undefined : layout.dockHeight, top: layout.tall ? 0 : undefined };

  return (
    <div
      className="ra"
      data-instant={instant ? "" : undefined}
      data-dragging={dragging ? "" : undefined}
    >
      <button
        ref={pill}
        type="button"
        className={cx("pill press", open && "is-hidden")}
        aria-label={`Open analytics devtools, ${online} online, ${errorCount} errors`}
        aria-hidden={open}
        tabIndex={open ? -1 : 0}
        onClick={() => {
          setInstant(false);
          dispatch({ type: "toggle" });
        }}
      >
        <span className={cx("dot", live.logs === "live" && "live")} />
        <span>{online}</span>
        <span className="lbl">online</span>
        {errorCount > 0 ? <span className="tag bad">{errorCount} err</span> : null}
        <span className="kbd">Ctrl ⇧ .</span>
      </button>

      <section
        ref={section}
        className={cx("panel", float && "float", !open && "is-hidden")}
        style={geometry}
        aria-label="Analytics devtools"
        aria-hidden={!open}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        inert={!open}
      >
        {!float && !layout.tall ? (
          <div
            className="grip-top"
            aria-hidden="true"
            onPointerDown={(event) => startDrag("top", event)}
            {...dragHandlers}
          />
        ) : null}
        {float && !layout.wide && !layout.tall ? (
          <div
            className="grip-corner"
            aria-hidden="true"
            onPointerDown={(event) => startDrag("corner", event)}
            {...dragHandlers}
          />
        ) : null}
        <header
          className={cx("head", float && "movable")}
          onPointerDown={float ? (event) => startDrag("move", event) : undefined}
          {...(float ? dragHandlers : {})}
        >
          <div className="brand">
            <span className={cx("dot", live.logs === "live" && "live")} />
            <strong>ra</strong>
            <span className="path">
              ~/<b>{runtime.bootstrap.project.name}</b>
            </span>
            <span className="m hide-sm">{online} online</span>
            <span className="env hide-sm">admin · {runtime.bootstrap.project.environment}</span>
          </div>
          <div className="modes">
            <button
              type="button"
              className={cx("ib", !float && "on")}
              aria-label="Dock to bottom"
              aria-pressed={!float}
              onClick={() => dispatch({ type: "mode", mode: "dock" })}
            >
              <Icon name="dock" />
            </button>
            <button
              type="button"
              className={cx("ib hide-sm", float && "on")}
              aria-label="Float"
              aria-pressed={float}
              onClick={() => dispatch({ type: "mode", mode: "float" })}
            >
              <Icon name="float" />
            </button>
            <span className="sep hide-sm" />
            <button
              type="button"
              className={cx("ib hide-sm", layout.wide && "on")}
              aria-label="Full width"
              aria-pressed={layout.wide}
              onClick={() => dispatch({ type: "wide" })}
            >
              <Icon name="wide" />
            </button>
            <button
              type="button"
              className={cx("ib", layout.tall && "on")}
              aria-label="Full height"
              aria-pressed={layout.tall}
              onClick={() => dispatch({ type: "tall" })}
            >
              <Icon name="tall" />
            </button>
            <span className="sep" />
            <button
              type="button"
              className="ib"
              aria-label="Collapse to pill"
              onClick={() => collapse(false)}
            >
              <Icon name="collapse" />
            </button>
          </div>
        </header>

        <TabBar active={layout.tab} counts={counts} onPick={(tab) => pick(tab, false)} />

        <div
          key={layout.tab}
          id="ra-panel"
          role="tabpanel"
          aria-labelledby={`ra-tab-${layout.tab}`}
          className="pane"
        >
          <Buffer
            runtime={runtime}
            filterRef={filterRef}
            register={(next) => {
              controller.current = next;
            }}
            jump={jump}
            follow={follow}
          />
        </div>

        <Statusline
          mode={streamMode}
          online={online}
          views={views}
          lcp={vitalText("lcp", live.overview?.lcp ?? null)}
          errors={errorCount}
          ingest={live.overview ? percent(live.overview.ingest.ratio) : "n/a"}
        />
      </section>

      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
}
