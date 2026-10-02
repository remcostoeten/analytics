import { ticketGroups, tickets } from "../content";

const railIcons = ["search", "home", "tasks", "people", "docs", "inbox", "code"] as const;
const filters = ["Active", "Backlog", "All"] as const;
const controls = ["Sort", "Priority", "Group by", "Favorite"] as const;

function RailIcon({ active }: { active: boolean }) {
  return (
    <span
      className={`flex size-6 items-center justify-center border ${active ? "border-ember bg-ember/15 text-ember" : "border-transparent text-fog"}`}
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 11 11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        aria-hidden
      >
        <rect x="1.5" y="1.5" width="8" height="8" />
      </svg>
    </span>
  );
}

export function TaskBoard() {
  return (
    <div className="flex h-full overflow-hidden border border-line bg-ink-raised text-xs">
      <aside className="flex w-10 flex-col items-center gap-3 border-r border-line py-3">
        <span className="flex size-6 items-center justify-center bg-ember text-ink">
          <span className="size-2.5 rounded-full border border-ink" />
        </span>
        {railIcons.map((icon, index) => (
          <RailIcon key={icon} active={index === 2} />
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
          <span className="text-sm text-paper">Tasks</span>
          <span className="bg-ink-panel px-1.5 py-0.5 text-[10px] text-mist">{tickets.length}</span>
        </div>
        <div className="flex gap-1.5 border-b border-line px-4 py-2.5">
          {filters.map((filter) => (
            <span key={filter} className="border border-line-strong px-2 py-1 text-mist">
              {filter}
            </span>
          ))}
        </div>
        <div className="flex gap-1.5 border-b border-line px-4 py-2.5">
          {controls.map((control) => (
            <span key={control} className="border border-line px-2 py-1 text-fog">
              {control}
            </span>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          {ticketGroups.map((group) => (
            <section key={group.status}>
              <h3 className="flex items-center gap-2 bg-ink-panel px-4 py-2 text-mist">
                <span
                  className={`size-2 rounded-full border ${group.status === "in-progress" ? "border-ember bg-ember/60" : "border-fog"}`}
                />
                {group.label}
              </h3>
              <p className="border-b border-line px-4 py-1.5 text-[10px] text-fog">Name</p>
              <ul>
                {tickets
                  .filter((ticket) => ticket.status === group.status)
                  .map((ticket) => (
                    <li
                      key={ticket.id}
                      className="flex items-center gap-3 border-b border-line px-4 py-2"
                    >
                      <span className="size-2.5 border border-line-strong" />
                      <span className="font-mono text-[10px] text-fog">{ticket.id}</span>
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
