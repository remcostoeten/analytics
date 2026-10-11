import type { ProjectScope } from "@spoar/client";
import type { StatsResponse } from "@spoar/contract";
import Link from "next/link";

import { formatMetric } from "../format";
import { readOutcomes, sumPoints } from "../logs";
import { metricPath, metricViews } from "../metrics";
import { readTopList } from "../reads";
import { viewQuery, withFilter } from "../view-state";
import type { FilterDimension, ViewState } from "../view-state";
import { ChangeBadge } from "./change-badge";
import { DeviceDonut } from "./device-donut";
import { EmptyState } from "./empty-state";
import { SeriesChart } from "./series-chart";
import { Sparkline } from "./sparkline";
import { TopList } from "./top-list";

type Props = { scope: ProjectScope; state: ViewState; base: string; path: string };

const tileViews = metricViews.slice(0, 4);

const topLists = [
  { dimension: "page", title: "Top paths" },
  { dimension: "host", title: "Top hosts" },
  { dimension: "referrer_domain", title: "Top referrers" },
  { dimension: "browser", title: "Top browsers" },
  { dimension: "os", title: "Top operating systems" },
  { dimension: "channel", title: "Top channels" },
] as const satisfies readonly { dimension: FilterDimension; title: string }[];

const topRows = 12;
const countryRows = 10;

function filterHref(path: string, state: ViewState, dimension: FilterDimension) {
  return (value: string) => `${path}${viewQuery(withFilter(state, dimension, value))}`;
}

export async function KpiTiles({
  scope,
  state,
  base,
  stats,
}: Pick<Props, "scope" | "state" | "base"> & { stats: Promise<StatsResponse["data"] | null> }) {
  const [data, ...series] = await Promise.all([
    stats,
    ...tileViews.map((view) => scope.timeseries(view.series)),
  ]);
  return (
    <div className="kpi-row">
      {tileViews.map((view, index) => {
        const stat = data ? data[view.stat] : null;
        const read = series[index];
        return (
          <Link
            key={view.slug}
            href={`${metricPath(base, view)}${viewQuery(state)}`}
            className="kpi-tile"
            prefetch={false}
          >
            <span className="text-xs text-muted">{view.label}</span>
            <span className="flex items-baseline gap-2">
              <span className="kpi-value">
                {stat ? formatMetric(stat.value, view.format, true) : "–"}
              </span>
              <ChangeBadge change={stat?.change ?? null} lowerIsBetter={view.lowerIsBetter} />
            </span>
            <Sparkline points={read?.ok ? read.value.data : []} />
          </Link>
        );
      })}
    </div>
  );
}

export async function TrafficSection({ scope }: Pick<Props, "scope">) {
  const read = await scope.timeseries("pageviews");
  if (!read.ok) {
    return <p className="text-sm text-err">Could not read the series: {read.error.message}</p>;
  }
  const total = sumPoints(read.value.data);
  return (
    <section className="card-section">
      <h2 className="card-title">Page views over time</h2>
      {total === 0 ? (
        <EmptyState title="No page views in this range" />
      ) : (
        <>
          <p className="flex items-center gap-1.5 text-xs">
            <span className="size-2 rounded-full bg-[var(--series-1)]" />
            <span className="text-muted">Page views</span>
            <span className="font-medium tabular-nums">{formatMetric(total, "count")}</span>
          </p>
          <SeriesChart
            series={[{ label: "Page views", points: read.value.data }]}
            format="count"
            interval={read.value.interval}
            label="Page views"
          />
        </>
      )}
    </section>
  );
}

export async function DeviceSection({ scope, state, path }: Omit<Props, "base">) {
  const read = await readTopList(scope, "device", "pageviews", 5);
  return (
    <section className="card-section">
      <h2 className="card-title">Page views by device type</h2>
      {read.ok ? (
        <DeviceDonut rows={read.value.data} hrefFor={filterHref(path, state, "device")} />
      ) : (
        <p className="text-sm text-err">{read.error}</p>
      )}
    </section>
  );
}

export async function CountrySection({ scope, state, path, base }: Props) {
  const read = await readTopList(scope, "country", "pageviews", countryRows);
  return (
    <section className="card-section">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="card-title">Page views by country</h2>
        <Link href={`${base}${viewQuery(state)}`} className="text-xs text-link underline">
          Open map
        </Link>
      </header>
      {read.ok ? (
        <TopList
          dimension="country"
          rows={read.value.data}
          count="pageviews"
          hrefFor={filterHref(path, state, "country")}
        />
      ) : (
        <p className="text-sm text-err">{read.error}</p>
      )}
    </section>
  );
}

export async function OutcomeBar({ scope }: Pick<Props, "scope">) {
  const read = await readOutcomes(scope);
  if (!read.ok) return <p className="text-sm text-err">{read.error}</p>;
  const parts = read.value.series.map((entry) => ({ ...entry, total: sumPoints(entry.points) }));
  const total = parts.reduce((sum, part) => sum + part.total, 0);
  return (
    <section className="card-section">
      <h2 className="card-title">Traffic outcomes</h2>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label="Legend">
        {parts.map((part, order) => (
          <li key={part.outcome} className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ background: `var(--series-${order + 1})` }}
            />
            <span className="text-muted">{part.label}</span>
            <span className="font-medium tabular-nums">{formatMetric(part.total, "count")}</span>
          </li>
        ))}
      </ul>
      <div className="outcome-bar" aria-hidden="true">
        {total > 0
          ? parts.map((part, order) => (
              <span
                key={part.outcome}
                style={{
                  width: `${(part.total / total) * 100}%`,
                  background: `var(--series-${order + 1})`,
                }}
              />
            ))
          : null}
      </div>
    </section>
  );
}

export async function TopGrid({ scope, state, path }: Omit<Props, "base">) {
  const reads = await Promise.all(
    topLists.map(async (list) => ({
      ...list,
      read: await readTopList(scope, list.dimension, "pageviews", topRows),
    })),
  );
  return (
    <div className="top-grid">
      {reads.map(({ dimension, title, read }) => (
        <section key={dimension} className="card card-section">
          {read.ok ? (
            <TopList
              title={title}
              dimension={dimension}
              rows={read.value.data}
              count="pageviews"
              hrefFor={filterHref(path, state, dimension)}
            />
          ) : (
            <p className="text-sm text-err">
              {title}: {read.error}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
