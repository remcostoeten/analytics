import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type NodeProps = {
  label: string;
  children?: ReactNode;
};

export function Flow({ children }: Props) {
  return (
    <ol className="not-prose my-6 flex flex-col gap-0 rounded-[10px] border border-dashed border-line bg-surface p-1 md:flex-row md:items-stretch">
      {children}
    </ol>
  );
}

export function FlowNode({ label, children }: NodeProps) {
  return (
    <li className="group relative flex flex-1 flex-col gap-1 rounded-md px-4 py-3 after:absolute after:left-1/2 after:-bottom-2 after:hidden after:size-1.5 after:-translate-x-1/2 after:rounded-full after:bg-line after:content-[''] group-last:after:hidden md:after:top-1/2 md:after:-right-1 md:after:bottom-auto md:after:left-auto md:after:block md:after:-translate-y-1/2 md:after:translate-x-0 md:last:after:hidden">
      <span className="caps text-[0.62rem] text-muted">{label}</span>
      {children ? <span className="text-[0.8rem] leading-snug text-fg">{children}</span> : null}
    </li>
  );
}
