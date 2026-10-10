import { CodeWindow } from "@/components/landing/code-window";
import { readShowcase } from "@/lib/showcase";

type Props = {
  read: "stats" | "timeseries" | "breakdown";
};

const calls = {
  stats: "stats()",
  timeseries: 'timeseries("visitors", { interval: "day" })',
  breakdown: 'breakdown("page", { metrics: ["visitors"], limit: 5 })',
};

async function answer(read: Props["read"]) {
  const showcase = await readShowcase();
  if (read === "stats") return showcase.stats;
  if (read === "timeseries") return showcase.series.length > 0 ? showcase.series.slice(-7) : null;
  return showcase.pages.length > 0 ? showcase.pages : null;
}

export async function LiveRead({ read }: Props) {
  const [showcase, data] = await Promise.all([readShowcase(), answer(read)]);
  if (data === null) return null;
  return (
    <figure className="not-prose my-6 flex flex-col gap-2">
      <CodeWindow title={`${calls[read]}.data`} lang="json" code={JSON.stringify(data, null, 2)} />
      <figcaption className="font-mono text-[0.72rem] text-muted">
        Live from {showcase.project} over the last 30 days
        {read === "timeseries" ? ", last 7 days shown" : ""}. Refreshed every minute.
      </figcaption>
    </figure>
  );
}
