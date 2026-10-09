import type { BreakdownRow, TimeseriesPoint } from "@spoar/contract";

import { Logo } from "@/components/logo";
import { apiEndpoint } from "@/lib/api-endpoint";
import { formatCount, formatDuration, formatPercent } from "@/lib/format";
import { readShowcase } from "@/lib/showcase";
import type { Showcase } from "@/lib/showcase";

import { LiveFeed } from "./live-feed";

const nav = ["Overview", "Pages", "Sources", "Events", "Web Vitals", "Errors", "SQL"];

type Stats = NonNullable<Showcase["stats"]>;

type Tile = {
  label: string;
  metric: keyof Stats;
  format: (value: number) => string;
  invert?: boolean;
};

const tiles: Tile[] = [
  { label: "Visitors", metric: "visitors", format: formatCount },
  { label: "Pageviews", metric: "pageviews", format: formatCount },
  { label: "Bounce rate", metric: "bounceRate", format: formatPercent, invert: true },
  { label: "Session", metric: "sessionDurationMs", format: formatDuration },
];

function formatChange(change: number | null) {
  if (change === null) return "new";
  const percent = Math.round(change * 100);
  return `${percent > 0 ? "+" : ""}${percent}%`;
}

function changeTone(change: number | null, invert: boolean | undefined) {
  if (change === null || change === 0) return "text-muted";
  return change > 0 !== Boolean(invert) ? "text-ok" : "text-err";
}

function linePath(values: number[], width: number, height: number) {
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  return values
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * (height - 8) - 4;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function Tiles({ stats }: { stats: Stats }) {
  return (
    <ul className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {tiles.map((tile) => {
        const compared = stats[tile.metric];
        return (
          <li key={tile.metric} className="rounded-lg border border-line p-2.5">
            <div className="text-[0.62rem] text-muted">{tile.label}</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-mono text-[1.05rem] font-medium text-fg tabular-nums">
                {tile.format(compared.value)}
              </span>
              <span
                className={`font-mono text-[0.6rem] ${changeTone(compared.change, tile.invert)}`}
              >
                {formatChange(compared.change)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Chart({ series }: { series: TimeseriesPoint[] }) {
  const values = series.map((point) => point.value);
  const path = linePath(values, 480, 120);
  return (
    <div className="rounded-lg border border-line p-2.5">
      <div className="text-[0.62rem] text-muted">Visitors per day</div>
      <svg viewBox="0 0 480 120" className="mt-2 h-28 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="live-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.2" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[30, 60, 90].map((y) => (
          <line key={y} x1="0" x2="480" y1={y} y2={y} stroke="var(--line)" strokeDasharray="3 4" />
        ))}
        {values.length > 1 ? (
          <>
            <path d={`${path} L480 120 L0 120 Z`} fill="url(#live-fill)" className="spark-fill" />
            <path
              d={path}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className="spark-line"
            />
          </>
        ) : null}
      </svg>
    </div>
  );
}

function Rows({ title, rows }: { title: string; rows: BreakdownRow[] }) {
  const max = Math.max(1, ...rows.map((row) => row.visitors ?? 0));
  return (
    <div className="rounded-lg border border-line p-2.5">
      <div className="text-[0.62rem] text-muted">{title}</div>
      {rows.length === 0 ? (
        <p className="mt-2 text-[0.65rem] text-muted">Nothing in the last 30 days.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1">
          {rows.map((row, index) => (
            <li key={row.value} className="grid grid-cols-[1fr_auto] items-center gap-2">
              <div className="relative h-5 overflow-hidden rounded-sm">
                <span
                  className="bar-grow absolute inset-y-0 left-0 rounded-sm bg-accent/12"
                  style={{
                    width: `${((row.visitors ?? 0) / max) * 100}%`,
                    animationDelay: `${500 + index * 80}ms`,
                  }}
                />
                <span className="relative truncate px-1.5 font-mono text-[0.65rem] leading-5 text-fg">
                  {row.value}
                </span>
              </div>
              <span className="font-mono text-[0.62rem] text-muted tabular-nums">
                {formatCount(row.visitors ?? 0)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export async function LiveDashboard() {
  const showcase = await readShowcase();
  const endpoint = apiEndpoint();
  return (
    <div className="panel-rise relative grid w-full grid-cols-1 overflow-hidden rounded-t-xl border border-b-0 border-line bg-surface text-left shadow-[0_30px_60px_-30px_rgb(80_30_20/0.35)] sm:grid-cols-[168px_1fr]">
      <aside className="hidden flex-col gap-4 border-r border-line bg-bg/60 p-3 sm:flex">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2 py-1.5">
          <Logo className="size-4" />
          <span className="truncate text-[0.72rem] font-medium text-fg">{showcase.project}</span>
        </div>
        <ul className="flex flex-col gap-0.5">
          {nav.map((item, index) => (
            <li
              key={item}
              className={`rounded-md px-2 py-1.5 text-[0.7rem] ${index === 0 ? "bg-fg/6 font-medium text-fg" : "text-muted"}`}
            >
              {item}
            </li>
          ))}
        </ul>
      </aside>
      <div className="flex min-w-0 flex-col gap-3 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <LiveFeed endpoint={endpoint} project={showcase.project} />
          <span className="rounded-md border border-line px-2 py-1 text-[0.65rem] text-muted">
            Last 30 days
          </span>
        </div>
        {showcase.stats ? (
          <Tiles stats={showcase.stats} />
        ) : (
          <p className="rounded-lg border border-dashed border-line p-3 text-[0.7rem] text-muted">
            No numbers for {showcase.project} yet.
          </p>
        )}
        <div className="grid gap-2 lg:grid-cols-[1.4fr_1fr]">
          <Chart series={showcase.series} />
          <Rows title="Top pages" rows={showcase.pages} />
        </div>
        <div className="hidden sm:block">
          <Rows title="Referrers" rows={showcase.sources} />
        </div>
      </div>
    </div>
  );
}
