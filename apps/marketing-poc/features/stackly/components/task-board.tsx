"use client";

import { useState } from "react";

import type { TicketStatus } from "../content";
import { taskCount, ticketGroups, tickets } from "../content";
import type { IconName } from "./icons";
import { Icon } from "./icons";
import { Mark } from "./primitives";

type Filter = "active" | "backlog" | "all";

const rail: { name: IconName; active?: boolean }[] = [
  { name: "home" },
  { name: "check-square", active: true },
  { name: "users" },
  { name: "file" },
  { name: "chart" },
  { name: "compass" },
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

function toggle<Value>(list: Value[], value: Value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function TaskBoard() {
  const [filter, setFilter] = useState<Filter>("all");
  const [checked, setChecked] = useState<string[]>([]);
  const [collapsed, setCollapsed] = useState<TicketStatus[]>([]);
  const [activeControl, setActiveControl] = useState<string | null>(null);

  const groups = ticketGroups.filter((group) => visibleStatuses[filter].includes(group.status));

  return (
    <div className="board-fade flex h-full overflow-hidden rounded-tl-md border-t border-l border-line-strong bg-ink-deep text-[13px] shadow-[-30px_0_80px_rgb(0_0_0/0.5)]">
      <aside className="flex w-12 flex-col items-center gap-4 border-r border-line pt-3">
        <span className="pulse flex size-7 items-center justify-center rounded-md bg-linear-to-b from-[#f0863a] to-[#c4581a] text-ink shadow-[0_0_0_1px_rgb(255_255_255/0.15)_inset]">
          <Mark size={15} />
        </span>
        <span className="tool mt-2 flex size-6 items-center justify-center rounded-sm text-fog">
          <Icon name="search" />
        </span>
        <span className="h-px w-5 bg-line" />
        {rail.map((item) => (
          <span
            key={item.name}
            className={`tool flex size-6 items-center justify-center rounded-sm border ${item.active ? "border-ember/70 bg-ember/15 text-ember" : "border-transparent text-fog"}`}
          >
            <Icon name={item.name} />
          </span>
        ))}
        <span className="h-px w-5 bg-line" />
        <span className="size-3 rounded-[2px] bg-[#4f8df5]" />
        <span className="text-[13px] leading-none font-bold text-[#4f8df5]">✕</span>
        <span className="size-3 rotate-45 rounded-[2px] bg-linear-to-br from-[#4f8df5] to-[#c653d8]" />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2.5 border-b border-line px-5 py-3">
          <span className="text-[15px] text-paper">Tasks</span>
          <span className="rounded-sm bg-ink-panel px-1.5 py-0.5 text-[11px] text-mist">
            {taskCount}
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-[10px] text-fog">
            <span className="blink size-1.5 rounded-full bg-leaf" />
            Live
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
              className="chip flex items-center gap-1.5 rounded-sm border border-line-strong bg-ink-raised px-2 py-1 text-[12px] text-mist hover:text-paper"
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
                className="chip flex items-center gap-1.5 rounded-sm border border-line bg-ink-raised px-2 py-1 text-[12px] text-mist hover:text-paper"
              >
                <Icon name={control.icon} size={12} className="text-fog" />
                {control.label}
              </button>
            </span>
          ))}
        </div>
        <div className="min-h-0 flex-1">
          {groups.map((group) => {
            const rows = tickets.filter((ticket) => ticket.status === group.status);
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
                  <span className="ml-1 text-[10px] text-fog">{rows.length}</span>
                  <span className="chevron ml-auto text-[9px] text-fog">⌄</span>
                </button>
                <div className="group-body" data-collapsed={isCollapsed}>
                  <div>
                    <p className="border-b border-line px-5 py-2 text-[12px] text-fog">Name</p>
                    <ul>
                      {rows.map((ticket) => {
                        const isChecked = checked.includes(ticket.id);
                        return (
                          <li
                            key={ticket.id}
                            className="row flex items-center gap-3 border-b border-line px-5 py-2.5"
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
                              <span className="ml-auto h-1 w-16 shrink-0 overflow-hidden rounded-full bg-line">
                                <span className="block h-full w-2/3 bg-ember" />
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
    </div>
  );
}
