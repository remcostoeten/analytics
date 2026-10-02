import { taskCount, ticketGroups, tickets } from "../content";
import type { IconName } from "./icons";
import { Icon } from "./icons";
import { Mark } from "./primitives";

const rail: { name: IconName; active?: boolean }[] = [
  { name: "home" },
  { name: "check-square", active: true },
  { name: "users" },
  { name: "file" },
  { name: "chart" },
  { name: "compass" },
];

const filters: { label: string; icon: IconName }[] = [
  { label: "Active", icon: "note" },
  { label: "Backlog", icon: "circle-dashed" },
  { label: "All", icon: "layers" },
];

const controls: { label: string; icon: IconName }[] = [
  { label: "Sort", icon: "sort" },
  { label: "Priority", icon: "flag" },
  { label: "Group by", icon: "group" },
  { label: "Favorite", icon: "star" },
];

const groupIcons: Record<string, IconName> = {
  backlog: "circle-dashed",
  todo: "circle",
  "in-progress": "circle-half",
};

export function TaskBoard() {
  return (
    <div className="board-fade flex h-full overflow-hidden rounded-tl-md border-t border-l border-line-strong bg-ink-deep text-[13px] shadow-[-30px_0_80px_rgb(0_0_0/0.5)]">
      <aside className="flex w-12 flex-col items-center gap-4 border-r border-line pt-3">
        <span className="flex size-7 items-center justify-center rounded-md bg-linear-to-b from-[#f0863a] to-[#c4581a] text-ink shadow-[0_0_0_1px_rgb(255_255_255/0.15)_inset]">
          <Mark size={15} />
        </span>
        <span className="mt-2 flex size-6 items-center justify-center text-fog">
          <Icon name="search" />
        </span>
        <span className="h-px w-5 bg-line" />
        {rail.map((item) => (
          <span
            key={item.name}
            className={`flex size-6 items-center justify-center rounded-sm border ${item.active ? "border-ember/70 bg-ember/15 text-ember" : "border-transparent text-fog"}`}
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
        </div>
        <div className="flex gap-2 border-b border-line px-5 py-3">
          {filters.map((filter) => (
            <span
              key={filter.label}
              className="flex items-center gap-1.5 rounded-sm border border-line-strong bg-ink-panel px-2 py-1 text-[12px] text-mist"
            >
              <Icon name={filter.icon} size={12} className="text-fog" />
              {filter.label}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 border-b border-line px-5 py-3">
          {controls.map((control, index) => (
            <span key={control.label} className="flex items-center gap-2">
              {index > 0 ? <span className="h-4 w-px bg-line" /> : null}
              <span className="flex items-center gap-1.5 rounded-sm border border-line bg-ink-raised px-2 py-1 text-[12px] text-mist">
                <Icon name={control.icon} size={12} className="text-fog" />
                {control.label}
              </span>
            </span>
          ))}
        </div>
        <div className="min-h-0 flex-1">
          {ticketGroups.map((group) => (
            <section key={group.status}>
              <h3 className="flex items-center gap-2 bg-ink-raised px-5 py-2.5 text-[12px] text-mist">
                <Icon
                  name={groupIcons[group.status] ?? "circle"}
                  size={12}
                  className={group.status === "in-progress" ? "text-ember" : "text-fog"}
                />
                {group.label}
              </h3>
              <p className="border-b border-line px-5 py-2 text-[12px] text-fog">Name</p>
              <ul>
                {tickets
                  .filter((ticket) => ticket.status === group.status)
                  .map((ticket) => (
                    <li
                      key={ticket.id}
                      className="flex items-center gap-3 border-b border-line px-5 py-2.5"
                    >
                      <span className="size-3 rounded-[2px] border border-line-strong" />
                      <span className="mono shrink-0 text-[11px] text-fog">{ticket.id}</span>
                      <span className="truncate text-mist">{ticket.title}</span>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
