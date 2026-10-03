type Props = {
  tone: "accent" | "ok" | "warn" | "err" | "muted";
  children: string;
};

const tones = {
  accent: "bg-accent/15 text-accent",
  ok: "bg-ok/15 text-ok",
  warn: "bg-warn/15 text-warn",
  err: "bg-err/15 text-err",
  muted: "bg-muted/15 text-muted",
};

export function Badge({ tone, children }: Props) {
  return (
    <span className={`caps w-fit rounded-full px-2 py-0.5 text-[0.65rem] ${tones[tone]}`}>
      {children}
    </span>
  );
}
