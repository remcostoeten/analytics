import { DatabaseIcon, RouteIcon, ServerIcon, ShieldIcon } from "./icons";

const stages = [
  { icon: RouteIcon, label: "SDK", detail: "Batches events, sends to /_ra" },
  { icon: ShieldIcon, label: "Checks", detail: "Key, origin, bot score" },
  { icon: ServerIcon, label: "Enrich", detail: "Geo, device, channel" },
  { icon: DatabaseIcon, label: "Postgres", detail: "Your database, hashed visitors" },
];

export function Pipeline() {
  return (
    <ol className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {stages.map((stage, index) => (
        <li
          key={stage.label}
          className="card-wash flex flex-col gap-4 rounded-[10px] border border-line bg-surface p-4"
        >
          <div className="flex items-center justify-between">
            <stage.icon className="size-3.5 text-muted" />
            <span className="caps text-[0.62rem] text-muted tabular-nums">0{index + 1}</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-[0.9rem] leading-[1.3] font-medium tracking-[-0.01em] text-fg">
              {stage.label}
            </div>
            <div className="text-[0.75rem] text-muted">{stage.detail}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}
