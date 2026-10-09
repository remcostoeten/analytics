import type { ReactNode } from "react";

type Props = { title: string; domain: string; children: ReactNode };

export function ProjectHeader({ title, domain, children }: Props) {
  return (
    <header className="panel-section grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-normal tracking-tight">{title}</h1>
        <span className="font-mono text-xs text-muted">{domain}</span>
      </div>
      {children}
    </header>
  );
}
