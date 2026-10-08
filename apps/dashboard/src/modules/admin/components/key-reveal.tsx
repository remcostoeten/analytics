import { Code } from "@/shared/ui/code";
import { CopyButton } from "@/shared/ui/copy-button";

type Props = { title: string; value: string; note: string };

export function KeyReveal({ title, value, note }: Props) {
  return (
    <section className="card grid gap-3 border-accent p-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="caps">{title}</h2>
        <CopyButton value={value} />
      </div>
      <Code value={value} />
      <p className="text-muted text-xs">{note}</p>
    </section>
  );
}
