import type { ReactNode } from "react";

type Props = { title: string; meta?: string; children?: ReactNode };

export function Heading({ title, meta, children }: Props) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-line pb-3">
      <div className="flex items-baseline gap-3">
        <h1 className="text-base font-medium">{title}</h1>
        {meta ? <span className="caps text-muted">{meta}</span> : null}
      </div>
      {children}
    </div>
  );
}
