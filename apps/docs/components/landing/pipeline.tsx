import { DatabaseIcon, RouteIcon, ServerIcon, ShieldIcon } from "./icons";

const stages = [
  { icon: RouteIcon, label: "SDK", detail: "Batches events, sends to /_ra" },
  { icon: ShieldIcon, label: "Checks", detail: "Key, origin, bot score" },
  { icon: ServerIcon, label: "Enrich", detail: "Geo, device, channel" },
  { icon: DatabaseIcon, label: "Postgres", detail: "Your database, hashed visitors" },
];

export function Pipeline() {
  return (
    <ol className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-fd-border bg-fd-border md:grid-cols-4">
      {stages.map((stage, index) => (
        <li key={stage.label} className="relative flex flex-col gap-3 bg-fd-card p-5">
          <div className="flex items-center justify-between">
            <stage.icon className="size-5 text-fd-foreground" />
            <span className="font-mono text-[11px] text-fd-muted-foreground">0{index + 1}</span>
          </div>
          <div>
            <div className="text-sm font-medium text-fd-foreground">{stage.label}</div>
            <div className="text-xs text-fd-muted-foreground">{stage.detail}</div>
          </div>
          {index < stages.length - 1 ? (
            <span className="landing-pulse absolute top-1/2 -right-1 hidden size-2 -translate-y-1/2 rounded-full bg-fd-foreground md:block" />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
