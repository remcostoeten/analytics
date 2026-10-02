"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { Ticket, TicketStatus } from "../content";
import { incomingTickets, taskCount, ticketGroups, tickets } from "../content";
import { useInterval } from "../hooks/use-interval";
import type { IconName } from "./icons";
import { Icon } from "./icons";
import { Mark } from "./primitives";

type Filter = "active" | "backlog" | "all";

type DemoStep = "idle" | "move" | "press" | "promote";

const rail: { name: IconName; label: string; active?: boolean }[] = [
  { name: "home", label: "Home" },
  { name: "check-square", label: "Tasks", active: true },
  { name: "users", label: "People" },
  { name: "file", label: "Docs" },
  { name: "chart", label: "Insights" },
  { name: "compass", label: "Explore" },
];

const filters: { key: Filter; label: string; icon: IconName }[] = [
  { key: "active", label: "Active", icon: "note" },
  { key: "backlog", label: "Backlog", icon: "circle-dashed" },
  { key: "all", label: "All", icon: "layers" },
];

const controls: { label: string; icon: IconName }[] = [
  { label: "Sort", icon: "sort" },
  { label: "Priority", icon: "flag" },
  { label: "Group by", icon: "group" },
  { label: "Favorite", icon: "star" },
];

const groupIcons: Record<TicketStatus, IconName> = {
  backlog: "circle-dashed",
  todo: "circle",
  "in-progress": "circle-half",
};

const visibleStatuses: Record<Filter, TicketStatus[]> = {
  active: ["todo", "in-progress"],
  backlog: ["backlog"],
  all: ["backlog", "todo", "in-progress"],
};

const nextStatus: Record<TicketStatus, TicketStatus> = {
  backlog: "todo",
  todo: "in-progress",
  "in-progress": "in-progress",
};

function toggle<Value>(list: Value[], value: Value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function TaskBoard() {
  const [rows, setRows] = useState<Ticket[]>(tickets);
  const [filter, setFilter] = useState<Filter>("all");
  const [checked, setChecked] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState<TicketStatus[]>([]);
  const [activeControl, setActiveControl] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [flash, setFlash] = useState<string | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number; step: DemoStep }>({
    x: 300,
    y: 260,
    step: "idle",
  });
  const [demoActive, setDemoActive] = useState(true);
  const board = useRef<HTMLDivElement>(null);
  const incoming = useRef(0);

  const groups = ticketGroups.filter((group) => visibleStatuses[filter].includes(group.status));

  const tick = useCallback(() => {
    setProgress((current) => {
      const next = { ...current };
      rows
        .filter((row) => row.status === "in-progress")
        .forEach((row) => {
          const value = next[row.id] ?? 20 + Math.random() * 30;
          next[row.id] = Math.min(96, value + 1.5 + Math.random() * 2);
        });
      return next;
    });
  }, [rows]);

  useInterval(tick, 900, demoActive);

  const runDemo = useCallback(() => {
    const container = board.current;
    const candidate = rows.find((row) => row.status === "todo" && !checked.includes(row.id));
    if (!container || !candidate) return;
    const target = container.querySelector<HTMLElement>(
      `[data-row="${candidate.id}"] [data-check]`,
    );
    if (!target) return;
    const bounds = container.getBoundingClientRect();
    const box = target.getBoundingClientRect();
    const x = box.left - bounds.left + box.width / 2;
    const y = box.top - bounds.top + box.height / 2;
    setCursor({ x, y, step: "move" });
    window.setTimeout(() => setCursor({ x, y, step: "press" }), 700);
    window.setTimeout(() => {
      setFlash(candidate.id);
      setRows((current) =>
        current.map((row) =>
          row.id === candidate.id ? { ...row, status: nextStatus[row.status] } : row,
        ),
      );
      setCursor({ x, y, step: "promote" });
    }, 950);
    window.setTimeout(() => setFlash(null), 1800);
    window.setTimeout(() => {
      const next = incomingTickets[incoming.current % incomingTickets.length];
      incoming.current += 1;
      if (!next) return;
      setFresh(next.id);
      setRows((current) =>
        current.some((row) => row.id === next.id) ? current : [next, ...current],
      );
      window.setTimeout(() => setFresh(null), 1200);
    }, 2400);
  }, [rows, checked]);

  useInterval(runDemo, 5200, demoActive);

  useEffect(() => {
    const container = board.current;
    if (!container) return;
    function pause() {
      setDemoActive(false);
    }
    function resume() {
      setDemoActive(true);
    }
    container.addEventListener("pointerenter", pause);
    container.addEventListener("pointerleave", resume);
    return () => {
      container.removeEventListener("pointerenter", pause);
      container.removeEventListener("pointerleave", resume);
    };
  }, []);

  return (
    <div
      ref={board}
      data-demo={demoActive}
      className="board-fade group/board relative flex h-full overflow-hidden rounded-tl-md border-t border-l border-line-strong bg-ink-deep text-[13px] shadow-[-30px_0_80px_rgb(0_0_0/0.5)]"
    >
      <aside className="flex w-12 flex-col items-center gap-4 border-r border-line pt-3">
        <span className="pulse flex size-7 items-center justify-center rounded-md bg-linear-to-b from-[#f0863a] to-[#c4581a] text-ink shadow-[0_0_0_1px_rgb(255_255_255/0.15)_inset]">
          <Mark size={15} />
        </span>
        <span className="tool mt-2 flex size-6 items-center justify-center rounded-sm text-fog">
          <Icon name="search" />
        </span>
        <span className="h-px w-5 bg-line" />
        {rail.map((item) => (
          <span key={item.name} className="tip relative" data-tip={item.label}>
            <span
              className={`tool flex size-6 items-center justify-center rounded-sm border ${item.active ? "border-ember/70 bg-ember/15 text-ember" : "border-transparent text-fog"}`}
            >
              <Icon name={item.name} />
            </span>
          </span>
        ))}
        <span className="h-px w-5 bg-line" />
        <span className="size-3 rounded-[2px] bg-[#4f8df5] transition-transform hover:scale-125" />
        <span className="text-[13px] leading-none font-bold text-[#4f8df5] transition-transform hover:rotate-90">
          ✕
        </span>
        <span className="size-3 rotate-45 rounded-[2px] bg-linear-to-br from-[#4f8df5] to-[#c653d8] transition-transform hover:rotate-[135deg]" />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2.5 border-b border-line px-5 py-3">
          <span className="text-[15px] text-paper">Tasks</span>
          <span className="rounded-sm bg-ink-panel px-1.5 py-0.5 text-[11px] text-mist tabular-nums">
            {taskCount + rows.length - tickets.length}
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-[10px] text-fog">
            <span className="blink size-1.5 rounded-full bg-leaf" />
            {demoActive ? "Live" : "Paused"}
          </span>
        </div>
        <div className="flex gap-2 border-b border-line px-5 py-3">
          {filters.map((item) => (
            <button
              type="button"
              key={item.key}
              data-filter={item.key}
              data-active={filter === item.key}
              onClick={() => setFilter(item.key)}
              className="chip flex items-center gap-1.5 rounded-sm border border-line-strong bg-ink-raised px-2 py-1 text-[12px] text-mist hover:text-paper active:scale-95"
            >
              <Icon name={item.icon} size={12} className="text-fog" />
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 border-b border-line px-5 py-3">
          {controls.map((control, index) => (
            <span key={control.label} className="flex items-center gap-2">
              {index > 0 ? <span className="h-4 w-px bg-line" /> : null}
              <button
                type="button"
                data-active={activeControl === control.label}
                onClick={() =>
                  setActiveControl(activeControl === control.label ? null : control.label)
                }
                className="chip flex items-center gap-1.5 rounded-sm border border-line bg-ink-raised px-2 py-1 text-[12px] text-mist hover:text-paper active:scale-95"
              >
                <Icon name={control.icon} size={12} className="text-fog" />
                {control.label}
              </button>
            </span>
          ))}
        </div>
        <div className="min-h-0 flex-1">
          {groups.map((group) => {
            const groupRows = rows.filter((ticket) => ticket.status === group.status);
            const isCollapsed = collapsed.includes(group.status);
            return (
              <section key={group.status} data-status={group.status}>
                <button
                  type="button"
                  data-group={group.status}
                  data-collapsed={isCollapsed}
                  onClick={() => setCollapsed(toggle(collapsed, group.status))}
                  className="row flex w-full items-center gap-2 bg-ink-raised px-5 py-2.5 text-[12px] text-mist"
                >
                  <Icon
                    name={groupIcons[group.status]}
                    size={12}
                    className={group.status === "in-progress" ? "text-ember" : "text-fog"}
                  />
                  {group.label}
                  <span className="ml-1 text-[10px] text-fog tabular-nums">{groupRows.length}</span>
                  <span className="chevron ml-auto text-[9px] text-fog">⌄</span>
                </button>
                <div className="group-body" data-collapsed={isCollapsed}>
                  <div>
                    <p className="border-b border-line px-5 py-2 text-[12px] text-fog">Name</p>
                    <ul>
                      {groupRows.map((ticket) => {
                        const isChecked = checked.includes(ticket.id);
                        return (
                          <li
                            key={ticket.id}
                            data-row={ticket.id}
                            data-flash={flash === ticket.id}
                            data-fresh={fresh === ticket.id}
                            className="row flex items-center gap-3 border-b border-line px-5 py-2.5 data-[flash=true]:bg-ember/10 data-[fresh=true]:animate-[row-in_600ms_ease-out]"
                          >
                            <button
                              type="button"
                              data-check={ticket.id}
                              data-checked={isChecked}
                              aria-label={`Mark ${ticket.id} done`}
                              onClick={() => setChecked(toggle(checked, ticket.id))}
                              className="check flex size-3.5 items-center justify-center rounded-[2px] border border-line-strong text-[8px] text-ink hover:border-fog"
                            >
                              {isChecked ? "✓" : ""}
                            </button>
                            <span className="mono shrink-0 text-[11px] text-fog">{ticket.id}</span>
                            <span className="ticket-title truncate text-mist">{ticket.title}</span>
                            {ticket.status === "in-progress" ? (
                              <span className="ml-auto flex shrink-0 items-center gap-2">
                                <span className="mono text-[9px] text-fog tabular-nums">
                                  {Math.round(progress[ticket.id] ?? 20)}%
                                </span>
                                <span className="h-1 w-16 overflow-hidden rounded-full bg-line">
                                  <span
                                    className="block h-full bg-ember transition-[width] duration-700 ease-out"
                                    style={{ width: `${progress[ticket.id] ?? 20}%` }}
                                  />
                                </span>
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
      <span
        data-step={cursor.step}
        className="demo-cursor pointer-events-none absolute z-10 opacity-0 transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-data-[demo=true]/board:opacity-100 data-[step=idle]:opacity-0"
        style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }}
      >
        <svg width="18" height="20" viewBox="0 0 18 20" fill="none" aria-hidden>
          <path
            d="M2 2 L16 10 L9.5 11.5 L6 18 Z"
            fill="#f2f1ed"
            stroke="#0a0a0b"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
        </svg>
        <span className="demo-ring absolute -top-2 -left-2 size-6 rounded-full border border-ember" />
      </span>
    </div>
  );
}
