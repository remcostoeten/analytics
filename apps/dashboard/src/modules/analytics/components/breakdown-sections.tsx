"use client";

import type { ProjectScope } from "@spoar/client";

import { SectionSkeleton } from "@/modules/shell/components/skeletons";
import { useReadOf } from "@/shared/query/read";
import type { Prefetchable } from "@/shared/query/read";

import type { MetricView } from "../metrics";
import { topListQuery } from "../queries";
import { dimensionLabel, viewQuery, withFilter } from "../view-state";
import type { FilterDimension, ViewState } from "../view-state";
import { CountryMap } from "./country-map";
import { ListSizeSelect } from "./list-size-select";
import { TopList } from "./top-list";

type Props = {
  scope: ProjectScope;
  view: MetricView;
  state: ViewState;
  path: string;
};

const countryRows = 10;
const mapRows = 100;

const sources = [
  { dimension: "referrer_domain", title: "Referrers" },
  { dimension: "page", title: "Paths" },
  { dimension: "host", title: "Hosts" },
  { dimension: "browser", title: "Browsers" },
  { dimension: "os", title: "Operating systems" },
  { dimension: "device", title: "Device types" },
] as const satisfies readonly { dimension: FilterDimension; title: string }[];

function hrefFor(path: string, state: ViewState, dimension: FilterDimension) {
  return (value: string) => `${path}${viewQuery(withFilter(state, dimension, value))}`;
}

/**
 * @name useTopList
 * @description The top values of one dimension on a scope, ranked by a metric's count, as a
 * query on the breakdown route's key.
 *
 * @example
 * const countries = useTopList(scope, "country", "visitors", 10);
 */
export function useTopList(
  scope: ProjectScope,
  dimension: FilterDimension,
  count: MetricView["count"],
  limit: number,
) {
  return useReadOf(topListQuery(scope, dimension, count, limit));
}

/**
 * @name breakdownReads
 * @description The country map and source list reads of the web analytics page for a view, for
 * warming the cache before a navigation to it.
 *
 * @example
 * prefetchReads(queryClient, breakdownReads(scope, view, state.items));
 */
export function breakdownReads(
  scope: ProjectScope,
  view: MetricView,
  items: number,
): Prefetchable[] {
  return [
    topListQuery(scope, "country", view.count, mapRows),
    ...sources.map((source) => topListQuery(scope, source.dimension, view.count, items)),
  ];
}

export function CountrySection({ scope, view, state, path }: Props) {
  const countries = useTopList(scope, "country", view.count, mapRows);
  const href = hrefFor(path, state, "country");
  if (countries.data === undefined) return <SectionSkeleton height={320} />;
  const read = countries.data;
  return (
    <section className="panel-section grid gap-4">
      <h2 className="text-base font-semibold">
        {view.label} by {dimensionLabel("country").toLowerCase()}
      </h2>
      {read.ok ? (
        <div className="country-grid">
          <CountryMap rows={read.value.data} count={view.count} path={path} state={state} />
          <div className="grid content-start gap-3">
            <TopList
              title="Top countries"
              dimension="country"
              rows={read.value.data.slice(0, countryRows)}
              count={view.count}
              hrefFor={href}
            />
            {read.value.data.length > countryRows ? (
              <p className="text-xs text-muted">
                Top {countryRows} of {read.value.data.length} countries
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-sm text-err">Could not read countries: {read.error}</p>
      )}
    </section>
  );
}

type SourceProps = Props & { dimension: FilterDimension; title: string };

function SourceCell({ scope, view, state, path, dimension, title }: SourceProps) {
  const list = useTopList(scope, dimension, view.count, state.items);
  if (list.data === undefined) return <div className="skeleton h-40" aria-hidden="true" />;
  const read = list.data;
  return read.ok ? (
    <TopList
      title={title}
      dimension={dimension}
      rows={read.value.data}
      count={view.count}
      hrefFor={hrefFor(path, state, dimension)}
    />
  ) : (
    <p className="text-sm text-err">
      {title}: {read.error}
    </p>
  );
}

export function SourcesSection(props: Props) {
  const { view, state, path } = props;
  return (
    <section className="panel-section grid gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{view.label} by source</h2>
        <ListSizeSelect path={path} state={state} />
      </header>
      <div className="source-grid">
        {sources.map((source) => (
          <div key={source.dimension} className="source-cell">
            <SourceCell {...props} dimension={source.dimension} title={source.title} />
          </div>
        ))}
      </div>
    </section>
  );
}
