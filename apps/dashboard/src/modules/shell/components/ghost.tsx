import { useId } from "react";

type GhostKind =
  | "chart"
  | "summary"
  | "list"
  | "pair"
  | "metrics"
  | "map"
  | "worldmap"
  | "sources"
  | "stats"
  | "outcome";

type GhostHead = "full" | "title" | "none";

type Props = {
  kind: GhostKind;
  height?: number;
  rows?: number;
  head?: GhostHead;
  framed?: boolean;
};

type BareProps = { height: number; rows?: number };

type TileProps = { height?: number; wide?: boolean };

const wave = "M0 72 C40 66 70 44 120 54 S200 92 260 66 S350 28 420 46 S520 90 600 42";

const listWidths = ["w-28", "w-40", "w-20", "w-36", "w-24", "w-32", "w-16", "w-28"];

const listFills = [92, 74, 58, 47, 35, 28, 20, 14];

const metricCards = ["visitors", "pageviews", "sessions", "bounce", "duration"];

const statCells = ["first", "second", "third", "fourth"];

const tabWidths = ["w-6", "w-14", "w-10", "w-14", "w-9", "w-14"];

const sourceCells = ["referrer", "host", "country", "path", "browser", "os"];

const headless: GhostKind[] = ["metrics", "stats"];

const titleOnly: GhostKind[] = ["map", "sources", "outcome", "pair"];

function Bar({ className }: { className: string }) {
  return <span className={`skeleton block ${className}`} />;
}

function Legend({ count }: { count: number }) {
  return (
    <div className="ghost-legend">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className="ghost-legend-item">
          <span className="ghost-dot" />
          <Bar className="h-3 w-12" />
          <Bar className="h-3 w-7" />
        </span>
      ))}
    </div>
  );
}

function Plot({ className = "" }: { className?: string }) {
  const id = useId().replace(/[^\w-]/g, "");
  return (
    <svg className={`ghost-plot-svg ${className}`} viewBox="0 0 600 120" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="ghost-fill-top" />
          <stop offset="100%" className="ghost-fill-bottom" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" className="ghost-shine-edge" />
          <stop offset="50%" className="ghost-shine-peak" />
          <stop offset="100%" className="ghost-shine-edge" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d={`${wave} V120 H0 Z`} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect width="600" height="120" fill={`url(#${id}-fill)`} />
        <rect className="ghost-shine" width="600" height="120" fill={`url(#${id}-shine)`} />
      </g>
      <path d={wave} className="ghost-outline" />
    </svg>
  );
}

function Spark({ className = "" }: { className?: string }) {
  return (
    <svg className={`ghost-spark ${className}`} viewBox="0 0 600 120" preserveAspectRatio="none">
      <path d={wave} className="ghost-outline" />
    </svg>
  );
}

/**
 * @name GhostChart
 * @description A legend row, a y-axis and a faint area with a passing shine, for a chart body that is still loading.
 *
 * @example
 * if (series.data === undefined) return <GhostChart height={240} />;
 */
export function GhostChart({ height }: Pick<BareProps, "height">) {
  return (
    <div className="ghost ghost-bare" style={{ height }} aria-hidden="true">
      <Chart />
    </div>
  );
}

/**
 * @name GhostList
 * @description Ranked ghost rows for a list or table body that is still loading.
 *
 * @example
 * if (list.data === undefined) return <GhostList height={160} rows={4} />;
 */
export function GhostList({ height, rows = 6 }: BareProps) {
  return (
    <div className="ghost ghost-bare" style={{ height }} aria-hidden="true">
      <List rows={rows} />
    </div>
  );
}

/**
 * @name GhostTile
 * @description A metric tile with a label, a value and a small wave, for a rail that is still loading.
 *
 * @example
 * <div className="rail">{metricViews.map((view) => <GhostTile key={view.slug} />)}</div>
 */
export function GhostTile({ height, wide = false }: TileProps) {
  return (
    <span
      className={wide ? "metric-card ghost-metric ghost-tile-wide" : "metric-card ghost-metric"}
      style={{ height }}
      aria-hidden="true"
    >
      <Bar className="h-3.5 w-16" />
      <Bar className="h-7 w-20" />
      <Spark />
    </span>
  );
}

/**
 * @name GhostKpi
 * @description A KPI tile with a label, a value with its change badge and a sparkline, sized like the
 * real tile so nothing moves when the numbers arrive.
 *
 * @example
 * <div className="kpi-row">{tileViews.map((view) => <GhostKpi key={view.slug} />)}</div>
 */
export function GhostKpi() {
  return (
    <span className="kpi-tile ghost-kpi" aria-hidden="true">
      <Bar className="my-0.5 h-3 w-16" />
      <span className="flex h-[1.8rem] items-center gap-2">
        <Bar className="h-5 w-20" />
        <Bar className="h-4 w-10" />
      </span>
      <Spark className="ghost-spark-kpi" />
    </span>
  );
}

function Axis() {
  return (
    <div className="ghost-plot">
      <div className="ghost-axis">
        {statCells.map((cell) => (
          <Bar key={cell} className="h-2.5 w-5" />
        ))}
      </div>
      <Plot />
    </div>
  );
}

function Chart() {
  return (
    <>
      <Legend count={2} />
      <Axis />
    </>
  );
}

function Summary() {
  return (
    <>
      <div className="ghost-tabs">
        {tabWidths.map((width, index) => (
          <Bar key={index} className={`h-3 ${width}`} />
        ))}
      </div>
      <div className="ghost-cells">
        {statCells.slice(0, 2).map((cell) => (
          <span key={cell} className="ghost-cell">
            <Bar className="h-3 w-16" />
            <Bar className="h-6 w-14" />
          </span>
        ))}
      </div>
      <Axis />
    </>
  );
}

function List({ rows }: { rows: number }) {
  return (
    <ul className="ghost-list">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="ghost-row">
          <span
            className="ghost-row-fill"
            style={{ width: `${listFills[index % listFills.length]}%` }}
          />
          <Bar className={`h-3.5 ${listWidths[index % listWidths.length]}`} />
          <Bar className="ml-auto h-3.5 w-8" />
        </li>
      ))}
    </ul>
  );
}

function Pair({ rows }: { rows: number }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {statCells.slice(0, 2).map((cell) => (
        <div key={cell} className="grid content-start gap-2">
          <Bar className="my-[3px] h-3.5 w-20" />
          <List rows={rows} />
        </div>
      ))}
    </div>
  );
}

function Metrics() {
  return (
    <>
      <div className="home-metrics">
        {metricCards.map((card) => (
          <GhostTile key={card} />
        ))}
      </div>
      <Bar className="h-3.5 w-64 max-w-full" />
      <Plot className="ghost-plot-tall" />
    </>
  );
}

function Stats() {
  return (
    <div className="ghost-stats">
      {statCells.slice(0, 3).map((cell) => (
        <span key={cell} className="grid gap-1.5">
          <Bar className="h-3 w-14" />
          <Bar className="h-6 w-20" />
          <Bar className="h-3 w-24" />
        </span>
      ))}
    </div>
  );
}

function Outcome() {
  return (
    <>
      <Legend count={3} />
      <span className="outcome-bar ghost-outcome" />
    </>
  );
}

function Heat() {
  return (
    <div className="heat-map ghost-heat">
      <Bar className="h-[31px] w-64 max-w-full" />
      <span className="ghost-heat-stage" />
      <Bar className="h-[18px] w-56 max-w-full" />
    </div>
  );
}

function Map({ rows }: { rows: number }) {
  return (
    <div className="country-grid">
      <Heat />
      <List rows={rows} />
    </div>
  );
}

function Sources({ rows }: { rows: number }) {
  return (
    <div className="source-grid">
      {sourceCells.map((cell) => (
        <div key={cell} className="source-cell">
          <List rows={rows} />
        </div>
      ))}
    </div>
  );
}

function body(kind: GhostKind, rows: number) {
  if (kind === "chart") return <Chart />;
  if (kind === "summary") return <Summary />;
  if (kind === "metrics") return <Metrics />;
  if (kind === "stats") return <Stats />;
  if (kind === "map") return <Map rows={rows} />;
  if (kind === "worldmap") return <Heat />;
  if (kind === "sources") return <Sources rows={rows} />;
  if (kind === "outcome") return <Outcome />;
  if (kind === "pair") return <Pair rows={rows} />;
  return <List rows={rows} />;
}

function defaultHead(kind: GhostKind): GhostHead {
  if (headless.includes(kind)) return "none";
  if (titleOnly.includes(kind)) return "title";
  return "full";
}

function Head({ head, action }: { head: GhostHead; action: boolean }) {
  if (head === "none") return null;
  return (
    <header className="ghost-head">
      <span className="ghost-head-text">
        <span className="ghost-title">
          <Bar className="h-4 w-28" />
        </span>
        {head === "full" ? (
          <span className="ghost-desc">
            <Bar className="h-3 w-48 max-w-full" />
          </span>
        ) : null}
      </span>
      {action ? <Bar className="h-[27px] w-24" /> : null}
    </header>
  );
}

function hasAction(kind: GhostKind) {
  return kind === "summary" || kind === "sources";
}

export function GhostCard({ kind, height, rows = 6, head, framed = true }: Props) {
  return (
    <div
      className={framed ? "card card-section ghost" : "card-section ghost"}
      style={height === undefined ? undefined : { height }}
      aria-hidden="true"
    >
      <Head head={head ?? defaultHead(kind)} action={hasAction(kind)} />
      {body(kind, rows)}
    </div>
  );
}

export function GhostSection({ kind, height, rows = 6, head }: Props) {
  return (
    <div
      className="panel-section ghost ghost-section"
      style={height === undefined ? undefined : { height }}
      aria-hidden="true"
    >
      <Head head={head ?? defaultHead(kind)} action={hasAction(kind)} />
      {body(kind, rows)}
    </div>
  );
}
