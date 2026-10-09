import type { ProjectScope } from "@spoar/client";

import type { MetricView } from "../metrics";
import { readTopList } from "../reads";
import { dimensionLabel, viewQuery, withFilter } from "../view-state";
import type { FilterDimension, ViewState } from "../view-state";
import { TopList } from "./top-list";

type Props = {
  scope: ProjectScope;
  view: MetricView;
  state: ViewState;
  path: string;
};

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

export async function CountrySection({ scope, view, state, path }: Props) {
  const read = await readTopList(scope, "country", view.count, 10);
  return (
    <section className="panel-section grid gap-4">
      <h2 className="text-base font-semibold">
        {view.label} by {dimensionLabel("country").toLowerCase()}
      </h2>
      {read.ok ? (
        <TopList
          title="Top countries"
          dimension="country"
          rows={read.value.data}
          count={view.count}
          hrefFor={hrefFor(path, state, "country")}
          columns
        />
      ) : (
        <p className="text-sm text-err">Could not read countries: {read.error}</p>
      )}
    </section>
  );
}

export async function SourcesSection({ scope, view, state, path }: Props) {
  const reads = await Promise.all(
    sources.map(async (source) => ({
      ...source,
      read: await readTopList(scope, source.dimension, view.count, 5),
    })),
  );
  return (
    <section className="panel-section grid gap-4">
      <h2 className="text-base font-semibold">{view.label} by source</h2>
      <div className="source-grid">
        {reads.map(({ dimension, title, read }) => (
          <div key={dimension} className="source-cell">
            {read.ok ? (
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
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
