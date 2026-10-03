import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
  className?: string;
};

export function CodeWindow({ title, children, className }: Props) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-fd-border bg-fd-card shadow-[0_24px_80px_-32px_rgba(0,0,0,0.6)] ${className ?? ""}`}
    >
      <div className="flex items-center gap-2 border-b border-fd-border px-4 py-2.5">
        <span className="size-2.5 rounded-full border border-fd-border bg-fd-muted" />
        <span className="size-2.5 rounded-full border border-fd-border bg-fd-muted" />
        <span className="size-2.5 rounded-full border border-fd-border bg-fd-muted" />
        <span className="ml-2 font-mono text-xs text-fd-muted-foreground">{title}</span>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-6 text-fd-foreground">
        <code>{children}</code>
      </pre>
    </div>
  );
}

type TokenProps = {
  children: ReactNode;
};

export function Kw({ children }: TokenProps) {
  return <span className="text-fd-muted-foreground">{children}</span>;
}

export function Str({ children }: TokenProps) {
  return (
    <span className="text-fd-foreground/80 underline decoration-fd-border underline-offset-4">
      {children}
    </span>
  );
}

export function Fn({ children }: TokenProps) {
  return <span className="font-medium text-fd-foreground">{children}</span>;
}

export function Cm({ children }: TokenProps) {
  return <span className="text-fd-muted-foreground/60">{children}</span>;
}
