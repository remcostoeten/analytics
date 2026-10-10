import type { ReactNode } from "react";

import { LiveBadge } from "@/modules/analytics/components/live-badge";

type Props = {
  title: string;
  domain: string;
  live?: { project: string; href: string };
  children: ReactNode;
};

export function ProjectHeader({ title, domain, live, children }: Props) {
  return (
    <header className="panel-section grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-normal tracking-tight">{title}</h1>
          {live ? <LiveBadge project={live.project} href={live.href} /> : null}
        </span>
        <span className="font-mono text-xs text-muted">{domain}</span>
      </div>
      {children}
    </header>
  );
}
