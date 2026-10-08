import { Logo } from "@/components/logo";

import { LiveCount, LiveToast } from "./live";

const nav = [
  { label: "Overview", count: null },
  { label: "Pages", count: "48" },
  { label: "Sources", count: "12" },
  { label: "Events", count: "9" },
  { label: "Web Vitals", count: null },
  { label: "Errors", count: "3" },
  { label: "SQL", count: null },
];

const stats = [
  { label: "Visitors", value: "4,812", change: "+12%" },
  { label: "Pageviews", value: "12,930", change: "+8%" },
  { label: "Bounce rate", value: "38%", change: "-3%" },
  { label: "Experience score", value: "94", change: "+2" },
];

const series = [32, 41, 38, 52, 47, 58, 54, 66, 61, 72, 69, 81, 76, 88];

const pages = [
  { path: "/", visitors: 1904, share: 100 },
  { path: "/docs", visitors: 1211, share: 64 },
  { path: "/pricing", visitors: 802, share: 42 },
  { path: "/blog/launch", visitors: 517, share: 27 },
  { path: "/changelog", visitors: 288, share: 15 },
];

const sources = [
  { name: "Direct", share: 41 },
  { name: "github.com", share: 23 },
  { name: "google.com", share: 19 },
  { name: "news.ycombinator.com", share: 11 },
];

function linePath(values: number[], width: number, height: number) {
  const max = Math.max(...values);
  const step = width / (values.length - 1);
  return values
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * (height - 8) - 4;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function DashboardMock() {
  const path = linePath(series, 480, 120);
  return (
    <div
      aria-hidden="true"
      className="panel-rise relative grid w-full grid-cols-1 overflow-hidden rounded-t-xl border border-b-0 border-line bg-surface text-left shadow-[0_30px_60px_-30px_rgb(80_30_20/0.35)] sm:grid-cols-[168px_1fr]"
    >
      <LiveToast />
      <aside className="hidden flex-col gap-4 border-r border-line bg-bg/60 p-3 sm:flex">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-2 py-1.5">
          <Logo className="size-4" />
          <span className="truncate text-[0.72rem] font-medium text-fg">example.com</span>
        </div>
        <ul className="flex flex-col gap-0.5">
          {nav.map((item, index) => (
            <li
              key={item.label}
              className={`flex items-center justify-between rounded-md px-2 py-1.5 text-[0.7rem] ${index === 0 ? "bg-fg/6 font-medium text-fg" : "text-muted"}`}
            >
              {item.label}
              {item.count ? <span className="font-mono text-[0.62rem]">{item.count}</span> : null}
            </li>
          ))}
        </ul>
      </aside>
      <div className="flex min-w-0 flex-col gap-3 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="animate-live size-1.5 rounded-full bg-accent" />
            <span className="text-[0.72rem] text-fg">
              <LiveCount /> visitors online
            </span>
          </div>
          <span className="rounded-md border border-line px-2 py-1 text-[0.65rem] text-muted">
            Last 14 days
          </span>
        </div>
        <ul className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <li key={stat.label} className="rounded-lg border border-line p-2.5">
              <div className="text-[0.62rem] text-muted">{stat.label}</div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-mono text-[1.05rem] font-medium text-fg tabular-nums">
                  {stat.value}
                </span>
                <span className="font-mono text-[0.6rem] text-ok">{stat.change}</span>
              </div>
            </li>
          ))}
        </ul>
        <div className="grid gap-2 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-lg border border-line p-2.5">
            <div className="text-[0.62rem] text-muted">Visitors per day</div>
            <svg viewBox="0 0 480 120" className="mt-2 h-28 w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="mock-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="var(--accent)" stopOpacity="0.2" />
                  <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[30, 60, 90].map((y) => (
                <line
                  key={y}
                  x1="0"
                  x2="480"
                  y1={y}
                  y2={y}
                  stroke="var(--line)"
                  strokeDasharray="3 4"
                />
              ))}
              <path d={`${path} L480 120 L0 120 Z`} fill="url(#mock-fill)" className="spark-fill" />
              <path
                d={path}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className="spark-line"
              />
            </svg>
          </div>
          <div className="rounded-lg border border-line p-2.5">
            <div className="text-[0.62rem] text-muted">Top pages</div>
            <ul className="mt-2 flex flex-col gap-1">
              {pages.map((page, index) => (
                <li key={page.path} className="grid grid-cols-[1fr_auto] items-center gap-2">
                  <div className="relative h-5 overflow-hidden rounded-sm">
                    <span
                      className="bar-grow absolute inset-y-0 left-0 rounded-sm bg-accent/12"
                      style={{ width: `${page.share}%`, animationDelay: `${500 + index * 80}ms` }}
                    />
                    <span className="relative px-1.5 font-mono text-[0.65rem] leading-5 text-fg">
                      {page.path}
                    </span>
                  </div>
                  <span className="font-mono text-[0.62rem] text-muted tabular-nums">
                    {page.visitors.toLocaleString("en-US")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="hidden rounded-lg border border-line p-2.5 sm:block">
          <div className="text-[0.62rem] text-muted">Sources</div>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 lg:grid-cols-4">
            {sources.map((source) => (
              <li key={source.name} className="flex flex-col gap-1">
                <div className="flex justify-between text-[0.65rem]">
                  <span className="truncate text-fg">{source.name}</span>
                  <span className="font-mono text-muted">{source.share}%</span>
                </div>
                <span className="h-1 rounded-full bg-fg/6">
                  <span
                    className="block h-1 rounded-full bg-fg/70"
                    style={{ width: `${source.share * 2}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
