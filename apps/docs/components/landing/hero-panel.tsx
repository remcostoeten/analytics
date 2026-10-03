const points = [12, 18, 15, 22, 28, 24, 31, 36, 33, 41, 46, 44, 52, 58, 55, 63];
const pages = [
  { path: "/", share: 100 },
  { path: "/pricing", share: 64 },
  { path: "/docs", share: 48 },
  { path: "/blog/launch", share: 31 },
];

function sparkline(values: number[], width: number, height: number) {
  const max = Math.max(...values);
  const step = width / (values.length - 1);
  return values
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * (height - 6) - 3;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function HeroPanel() {
  const path = sparkline(points, 320, 96);
  return (
    <div className="panel-rise rounded-[10px] border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="animate-live size-1.5 rounded-full bg-accent" />
          <span className="caps text-[0.62rem] text-muted">Live</span>
        </div>
        <span className="caps text-[0.62rem] text-muted">example.com</span>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="caps text-[0.6rem] text-muted">Visitors, last 30 min</div>
          <div className="mt-1 font-mono text-3xl font-medium text-fg tabular-nums">1,284</div>
        </div>
        <div className="rounded-md bg-ok/15 px-2 py-0.5 font-mono text-[0.65rem] text-ok">+12%</div>
      </div>
      <svg viewBox="0 0 320 96" className="mt-3 h-24 w-full" aria-hidden="true">
        <defs>
          <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.18" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L320 96 L0 96 Z`} fill="url(#spark-fill)" className="spark-fill" />
        <path
          d={path}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          className="spark-line"
        />
      </svg>
      <div className="mt-4 border-t border-dashed border-line pt-3">
        <div className="caps mb-2 text-[0.6rem] text-muted">Top pages</div>
        <ul className="flex flex-col gap-1.5">
          {pages.map((page, index) => (
            <li key={page.path} className="grid grid-cols-[1fr_auto] items-center gap-3">
              <div className="relative h-5 overflow-hidden rounded-sm">
                <span
                  className="bar-grow absolute inset-y-0 left-0 rounded-sm bg-fg/8"
                  style={{ width: `${page.share}%`, animationDelay: `${500 + index * 90}ms` }}
                />
                <span className="relative px-2 font-mono text-[0.72rem] leading-5 text-fg">
                  {page.path}
                </span>
              </div>
              <span className="font-mono text-[0.68rem] text-muted tabular-nums">
                {Math.round(page.share * 4.1)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
