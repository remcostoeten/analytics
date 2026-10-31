"use client";

import type { ProjectScope } from "@spoar/client";

import { SectionSkeleton } from "@/modules/shell/components/skeletons";
import { useReadOf } from "@/shared/query/read";
import type { Prefetchable } from "@/shared/query/read";

import { formatMetric } from "../format";
import { statsQuery, topListQuery } from "../queries";
import { viewQuery, withFilter } from "../view-state";
import type { FilterDimension, ViewState } from "../view-state";
import { useTopList } from "./breakdown-sections";
import { ChangeBadge } from "./change-badge";
import { TopList } from "./top-list";

type Props = { scope: ProjectScope; state: ViewState; path: string };

type FactProps = { label: string; value: string; change: number | null; note?: string };

const topRows = 5;

function Fact({ label, value, change, note }: FactProps) {
  return (
    <div className="visitor-fact">
      <span className="text-xs text-muted">{label}</span>
      <span className="flex flex-wrap items-baseline gap-2">
        <span className="metric-value">{value}</span>
        <ChangeBadge change={change} lowerIsBetter={false} />
      </span>
      {note ? <span className="text-xs text-muted">{note}</span> : null}
    </div>
  );
}

function hrefFor(path: string, state: ViewState, dimension: FilterDimension) {
  return (value: string) => `${path}${viewQuery(withFilter(state, dimension, value))}`;
}

/**
 * @name visitorSummaryReads
 * @description The visitor summary's reads on a scope, for warming the cache before a navigation.
 *
 * @example
 * prefetchReads(queryClient, visitorSummaryReads(scope));
 */
export function visitorSummaryReads(scope: ProjectScope): Prefetchable[] {
  return [
    statsQuery(scope),
    topListQuery(scope, "country", "visitors", topRows),
    topListQuery(scope, "device", "visitors", topRows),
  ];
}

export function VisitorSummary({ scope, state, path }: Props) {
  const statsRead = useReadOf(statsQuery(scope));
  const countriesRead = useTopList(scope, "country", "visitors", topRows);
  const devicesRead = useTopList(scope, "device", "visitors", topRows);
  if (statsRead.data === undefined) return <SectionSkeleton height={160} />;
  const stats = statsRead.data;
  const countries = countriesRead.data;
  const devices = devicesRead.data;
  if (!stats.ok) return null;
  const data = stats.value.data;
  const perVisitor = data.visitors.value > 0 ? data.sessions.value / data.visitors.value : 0;
  return (
    <section className="panel-section visitor-summary">
      <div className="visitor-facts">
        <Fact
          label="Visitors"
          value={formatMetric(data.visitors.value, "count")}
          change={data.visitors.change}
          note={`${perVisitor.toFixed(1)} sessions each`}
        />
        <Fact
          label="Sessions"
          value={formatMetric(data.sessions.value, "count")}
          change={data.sessions.change}
          note={`${formatMetric(data.bounceRate.value, "percent")} bounced`}
        />
        <Fact
          label="Pageviews"
          value={formatMetric(data.pageviews.value, "count")}
          change={data.pageviews.change}
          note={`${data.pagesPerSession.value.toFixed(1)} per session`}
        />
      </div>
      {countries?.ok ? (
        <TopList
          title="Where from"
          dimension="country"
          rows={countries.value.data}
          count="visitors"
          hrefFor={hrefFor(path, state, "country")}
        />
      ) : null}
      {devices?.ok ? (
        <TopList
          title="On what"
          dimension="device"
          rows={devices.value.data}
          count="visitors"
          hrefFor={hrefFor(path, state, "device")}
        />
      ) : null}
    </section>
  );
}
