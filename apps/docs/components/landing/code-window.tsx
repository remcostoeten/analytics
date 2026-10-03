import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
};

export function CodeWindow({ title, children }: Props) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-dashed border-line px-4 py-2">
        <span className="caps text-[0.62rem] text-muted">{title}</span>
        <span className="caps text-[0.62rem] text-muted">ts</span>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-6 text-fg">
        <code>{children}</code>
      </pre>
    </div>
  );
}

type TokenProps = {
  children: ReactNode;
};

export function Kw({ children }: TokenProps) {
  return <span className="text-muted">{children}</span>;
}

export function Str({ children }: TokenProps) {
  return <span className="text-fg/80">{children}</span>;
}

export function Fn({ children }: TokenProps) {
  return <span className="font-medium text-fg">{children}</span>;
}

export function Cm({ children }: TokenProps) {
  return <span className="text-muted/70">{children}</span>;
}
