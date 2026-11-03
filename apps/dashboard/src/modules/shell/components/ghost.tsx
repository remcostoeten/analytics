import { useId } from "react";

type GhostKind = "chart" | "list" | "metrics" | "map" | "stats";

type Props = { kind: GhostKind; height: number; rows?: number };

type BareProps = { height: number; rows?: number };

type TileProps = { height?: number; wide?: boolean };

const wave = "M0 72 C40 66 70 44 120 54 S200 92 260 66 S350 28 420 46 S520 90 600 42";

const listWidths = ["w-28", "w-40", "w-20", "w-36", "w-24", "w-32", "w-16", "w-28"];

const listFills = [92, 74, 58, 47, 35, 28, 20, 14];

const metricCards = ["visitors", "pageviews", "sessions", "bounce", "duration"];

const statCells = ["first", "second", "third", "fourth"];

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

function Spark() {
  return (
    <svg className="ghost-spark" viewBox="0 0 600 120" preserveAspectRatio="none">
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

function Chart() {
  return (
    <>
      <Legend count={2} />
      <div className="ghost-plot">
        <div className="ghost-axis">
          {statCells.map((cell) => (
            <Bar key={cell} className="h-2.5 w-5" />
          ))}
        </div>
        <Plot />
      </div>
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
      {statCells.map((cell) => (
        <span key={cell} className="grid gap-1.5">
          <Bar className="h-3 w-14" />
          <Bar className="h-6 w-20" />
        </span>
      ))}
    </div>
  );
}

function Map() {
  return (
    <div className="ghost-map">
      <List rows={8} />
      <div className="ghost-map-globe">
        <Plot className="ghost-plot-faint" />
      </div>
    </div>
  );
}

function body(kind: GhostKind, rows: number) {
  if (kind === "chart") return <Chart />;
  if (kind === "metrics") return <Metrics />;
  if (kind === "stats") return <Stats />;
  if (kind === "map") return <Map />;
  return <List rows={rows} />;
}

function Head({ kind }: Pick<Props, "kind">) {
  if (kind === "metrics") return null;
  return (
    <header className="ghost-head">
      <span className="grid gap-1.5">
        <Bar className="h-4 w-24" />
        <Bar className="h-3 w-40 max-w-full" />
      </span>
      {kind === "chart" ? <Bar className="h-6 w-28" /> : null}
    </header>
  );
}

export function GhostCard({ kind, height, rows = 6 }: Props) {
  return (
    <div className="card card-section ghost" style={{ height }} aria-hidden="true">
      <Head kind={kind} />
      {body(kind, rows)}
    </div>
  );
}

export function GhostSection({ kind, height, rows = 6 }: Props) {
  return (
    <div className="panel-section ghost ghost-section" style={{ height }} aria-hidden="true">
      <Head kind={kind} />
      {body(kind, rows)}
    </div>
  );
}
