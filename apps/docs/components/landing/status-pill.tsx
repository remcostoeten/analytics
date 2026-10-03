type Props = {
  state: "running" | "ok" | "warn" | "err";
  children: string;
};

const dot = {
  running: "before:bg-accent before:animate-live",
  ok: "before:bg-ok",
  warn: "before:bg-warn",
  err: "before:bg-err",
};

export function StatusPill({ state, children }: Props) {
  return (
    <span
      data-state={state}
      className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-0.5 font-mono text-[0.65rem] font-medium tracking-[0.02em] text-fg uppercase before:size-1.5 before:rounded-full ${dot[state]}`}
    >
      {children}
    </span>
  );
}
