const tiles = [
  { label: "Visitors", value: "1,284", change: "+12%" },
  { label: "Pageviews", value: "3,906", change: "+8%" },
  { label: "Bounce rate", value: "41%", change: "-3%" },
];

const pages = [
  { value: "/", visitors: 812 },
  { value: "/blog/[slug]", visitors: 344 },
  { value: "/pricing", visitors: 97 },
  { value: "/docs", visitors: 31 },
];

const largest = Math.max(...pages.map((page) => page.visitors));

export function DashboardPreview() {
  return (
    <figure className="not-prose my-6 rounded-[10px] border border-line bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-[0.9rem] font-medium text-fg">example.com</span>
        <span className="caps text-[0.62rem] text-muted">Last 7 days</span>
      </div>
      <dl className="grid grid-cols-3 gap-2">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-md border border-line px-3 py-2">
            <dt className="caps text-[0.62rem] text-muted">{tile.label}</dt>
            <dd className="text-[1.1rem] font-medium text-fg">{tile.value}</dd>
            <span className="text-[0.7rem] text-muted">{tile.change}</span>
          </div>
        ))}
      </dl>
      <div className="mt-3 rounded-md border border-line px-3 py-2">
        <span className="caps text-[0.62rem] text-muted">Top pages</span>
        <ol className="mt-1 flex flex-col gap-1">
          {pages.map((page) => (
            <li key={page.value} className="relative flex justify-between text-[0.8rem] text-fg">
              <span
                className="absolute inset-y-0 left-0 rounded-sm bg-line opacity-50"
                style={{ width: `${(page.visitors / largest) * 100}%` }}
              />
              <span className="relative px-1">{page.value}</span>
              <span className="relative px-1 tabular-nums">{page.visitors}</span>
            </li>
          ))}
        </ol>
      </div>
      <figcaption className="mt-3 text-[0.7rem] text-muted">
        Sample numbers. The page below renders this layout from your project.
      </figcaption>
    </figure>
  );
}
