"use client";

import { createClient } from "@spoar/client";
import type { Filters } from "@spoar/client";
import type { BreakdownRow, TimeseriesPoint, TrafficFilter } from "@spoar/contract";
import { useEffect, useMemo, useState } from "react";

import { formatCount, formatDuration, formatPercent } from "@/lib/format";
import type { Showcase } from "@/lib/showcase";
import { showcaseReads } from "@/lib/showcase-period";

import { CountUp } from "./count-up";
import { LiveFeed } from "./live-feed";
import { stagger } from "./stagger";

type Props = {
  endpoint: string;
  showcase: Showcase;
};

type Stats = NonNullable<Showcase["stats"]>;

type Traffic = Extract<TrafficFilter, "human" | "bots" | "all">;

type Focus = { dimension: "page" | "referrer_domain"; value: string };

type Tile = {
  label: string;
  metric: keyof Stats;
  kind: "count" | "percent" | "duration";
  invert?: boolean;
};

const traffics: { value: Traffic; label: string }[] = [
  { value: "human", label: "Humans" },
  { value: "bots", label: "Bots" },
  { value: "all", label: "All" },
];

const tiles: Tile[] = [
  { label: "Visitors", metric: "visitors", kind: "count" },
  { label: "Pageviews", metric: "pageviews", kind: "count" },
  { label: "Bounce rate", metric: "bounceRate", kind: "percent", invert: true },
  { label: "Session", metric: "sessionDurationMs", kind: "duration" },
];

const valueClass = "font-mono text-[1.05rem] font-medium text-fg tabular-nums";

function seriesKey(traffic: Traffic, focus: Focus | null) {
  return focus ? `${traffic}:${focus.dimension}=${focus.value}` : traffic;
}

function useCached<Value>(initialKey: string, initial: Value) {
  const [entries, setEntries] = useState(() => new Map<string, Value>([[initialKey, initial]]));
  const [store] = useState(
    () => (key: string, value: Value) =>
      setEntries((previous) => new Map(previous).set(key, value)),
  );
  return { entries, store };
}

function useViews(endpoint: string, project: string, showcase: Showcase) {
  const client = useMemo(() => createClient({ endpoint }).project(project), [endpoint, project]);
  const [traffic, setTraffic] = useState<Traffic>("human");
  const [focus, setFocus] = useState<Focus | null>(null);
  const statsCache = useCached<Stats | null>("human", showcase.stats);
  const seriesCache = useCached<TimeseriesPoint[]>("human", showcase.series);
  const key = seriesKey(traffic, focus);

  const hasStats = statsCache.entries.has(traffic);
  const hasSeries = seriesCache.entries.has(key);

  useEffect(() => {
    if (hasStats) return;
    let active = true;
    void showcaseReads(client)
      .traffic(traffic)
      .stats()
      .then((stats) => {
        if (active) statsCache.store(traffic, stats.ok ? stats.value.data : null);
      });
    return () => {
      active = false;
    };
  }, [client, hasStats, statsCache.store, traffic]);

  useEffect(() => {
    if (hasSeries) return;
    let active = true;
    const filter: Filters = focus ? { [focus.dimension]: focus.value } : {};
    void showcaseReads(client)
      .traffic(traffic)
      .where(filter)
      .timeseries("visitors", { interval: "day" })
      .then((series) => {
        if (active) seriesCache.store(key, series.ok ? series.value.data : []);
      });
    return () => {
      active = false;
    };
  }, [client, focus, hasSeries, key, seriesCache.store, traffic]);

  function refresh() {
    const filter: Filters = focus ? { [focus.dimension]: focus.value } : {};
    const reads = showcaseReads(client).traffic(traffic);
    void Promise.all([
      reads.stats(),
      reads.where(filter).timeseries("visitors", { interval: "day" }),
    ]).then(([stats, series]) => {
      if (stats.ok) statsCache.store(traffic, stats.value.data);
      if (series.ok) seriesCache.store(key, series.value.data);
    });
  }

  const stats = statsCache.entries.get(traffic);
  return {
    traffic,
    setTraffic,
    focus,
    setFocus,
    refresh,
    stats: stats === undefined ? showcase.stats : stats,
    series: seriesCache.entries.get(key) ?? seriesCache.entries.get(traffic) ?? showcase.series,
    pending: !hasSeries,
  };
}

function TileValue({ kind, value }: { kind: Tile["kind"]; value: number }) {
  if (kind === "count") return <CountUp value={value} className={valueClass} />;
  const text = kind === "percent" ? formatPercent(value) : formatDuration(value);
  return <span className={valueClass}>{text}</span>;
}

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

function TrafficPills({ value, onChange }: { value: Traffic; onChange: (t: Traffic) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Traffic"
      className="flex rounded-md border border-line p-0.5 text-[0.62rem]"
    >
      {traffics.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`traffic-pill rounded-[5px] px-2 py-0.5 ${value === option.value ? "bg-fg text-surface" : "text-muted"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Tiles({ stats, traffic }: { stats: Stats; traffic: Traffic }) {
  return (
    <ul className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {tiles.map((tile, index) => {
        const compared = stats[tile.metric];
        return (
          <li
            key={tile.metric}
            style={stagger(index)}
            className="tile-pulse relative rounded-lg border border-line p-2.5 transition-colors duration-200 hover:border-fg/20"
          >
            <div className="text-[0.62rem] text-muted">{tile.label}</div>
            <div key={traffic} className="tick-in mt-1 flex items-baseline gap-1.5">
              <TileValue kind={tile.kind} value={compared.value} />
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

function Chart({
  series,
  focus,
  pending,
}: {
  series: TimeseriesPoint[];
  focus: Focus | null;
  pending: boolean;
}) {
  const values = series.map((point) => point.value);
  const path = linePath(values, 480, 120);
  return (
    <div className="rounded-lg border border-line p-2.5">
      <div className="flex items-center justify-between gap-2 text-[0.62rem] text-muted">
        <span>Visitors per day</span>
        {focus ? <span className="tick-in truncate font-mono text-fg">{focus.value}</span> : null}
      </div>
      <svg
        viewBox="0 0 480 120"
        className={`mt-2 h-28 w-full transition-opacity duration-200 ${pending ? "opacity-50" : ""}`}
        preserveAspectRatio="none"
      >
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
            <path
              d={`${path} L480 120 L0 120 Z`}
              fill="url(#live-fill)"
              className="spark-fill chart-morph"
            />
            <path
              d={path}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className="spark-line chart-morph"
            />
            <g className="chart-cursor" style={{ offsetPath: `path("${path}")` }}>
              <line
                y1="-120"
                y2="120"
                stroke="var(--accent)"
                strokeOpacity="0.3"
                strokeDasharray="2 3"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d="M0 0h0.01"
                stroke="var(--accent)"
                strokeWidth="7"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d="M0 0h0.01"
                stroke="var(--surface)"
                strokeWidth="3"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          </>
        ) : null}
      </svg>
    </div>
  );
}

function Rows({
  title,
  dimension,
  rows,
  focus,
  onFocus,
}: {
  title: string;
  dimension: Focus["dimension"];
  rows: BreakdownRow[];
  focus: Focus | null;
  onFocus: (focus: Focus | null) => void;
}) {
  const max = Math.max(1, ...rows.map((row) => row.visitors ?? 0));
  return (
    <div className="rounded-lg border border-line p-2.5" onPointerLeave={() => onFocus(null)}>
      <div className="text-[0.62rem] text-muted">{title}</div>
      {rows.length === 0 ? (
        <p className="mt-2 text-[0.65rem] text-muted">Nothing in the last 30 days.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1">
          {rows.map((row, index) => {
            const active = focus?.dimension === dimension && focus.value === row.value;
            return (
              <li key={row.value}>
                <button
                  type="button"
                  aria-pressed={active}
                  onPointerEnter={() => onFocus({ dimension, value: row.value })}
                  onFocus={() => onFocus({ dimension, value: row.value })}
                  onBlur={() => onFocus(null)}
                  className={`grid w-full grid-cols-[1fr_auto] items-center gap-2 rounded-sm text-left ${active ? "bg-fg/4" : ""}`}
                >
                  <span
                    className="row-shine relative block h-5 overflow-hidden rounded-sm"
                    style={stagger(index)}
                  >
                    <span
                      className="bar-grow absolute inset-y-0 left-0 rounded-sm bg-accent/12"
                      style={{
                        width: `${((row.visitors ?? 0) / max) * 100}%`,
                        animationDelay: `${500 + index * 80}ms`,
                      }}
                    />
                    <span className="relative block truncate px-1.5 font-mono text-[0.65rem] leading-5 text-fg">
                      {row.value}
                    </span>
                  </span>
                  <span className="font-mono text-[0.62rem] text-muted tabular-nums">
                    {formatCount(row.visitors ?? 0)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function DashboardPanel({ endpoint, showcase }: Props) {
  const live = useViews(endpoint, showcase.project, showcase);
  return (
    <div className="flex min-w-0 flex-col gap-3 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <LiveFeed endpoint={endpoint} project={showcase.project} onFresh={live.refresh} />
        <div className="flex items-center gap-1.5">
          <TrafficPills value={live.traffic} onChange={live.setTraffic} />
          <span className="hidden rounded-md border border-line px-2 py-1 text-[0.65rem] text-muted sm:inline">
            Last 30 days
          </span>
        </div>
      </div>
      {live.stats ? (
        <Tiles stats={live.stats} traffic={live.traffic} />
      ) : (
        <p className="rounded-lg border border-dashed border-line p-3 text-[0.7rem] text-muted">
          No numbers for {showcase.project} yet.
        </p>
      )}
      <div className="grid gap-2 lg:grid-cols-[1.4fr_1fr]">
        <Chart series={live.series} focus={live.focus} pending={live.pending} />
        <Rows
          title="Top pages"
          dimension="page"
          rows={showcase.pages}
          focus={live.focus}
          onFocus={live.setFocus}
        />
      </div>
      <div className="hidden sm:block">
        <Rows
          title="Referrers"
          dimension="referrer_domain"
          rows={showcase.sources}
          focus={live.focus}
          onFocus={live.setFocus}
        />
      </div>
    </div>
  );
}
