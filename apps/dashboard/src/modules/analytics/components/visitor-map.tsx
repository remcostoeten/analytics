"use client";

import type { ProjectScope } from "@spoar/client";
import { useRouter } from "next/navigation";

import { GhostSection } from "@/modules/shell/components/ghost";
import type { Prefetchable } from "@/shared/query/read";

import { topListQuery } from "../queries";
import { viewQuery, withFilter } from "../view-state";
import type { ViewState } from "../view-state";
import { useTopList } from "./breakdown-sections";
import { HeatMap } from "./heat-map";

type Props = { scope: ProjectScope; state: ViewState; path: string };

const mapRows = 100;

/**
 * @name visitorMapReads
 * @description The visitor map's read on a scope, for warming the cache before a navigation. It
 * is the read the web analytics map makes for visitors, so the two share one answer.
 *
 * @example
 * prefetchReads(queryClient, visitorMapReads(scope));
 */
export function visitorMapReads(scope: ProjectScope): Prefetchable[] {
  return [topListQuery(scope, "country", "visitors", mapRows)];
}

export function VisitorMap({ scope, state, path }: Props) {
  const router = useRouter();
  const countries = useTopList(scope, "country", "visitors", mapRows);
  if (countries.data === undefined) return <GhostSection kind="worldmap" />;
  const read = countries.data;
  const active = state.filters.country;
  return (
    <section className="panel-section grid gap-4">
      <h2 className="text-base font-semibold">Visitors by country</h2>
      {read.ok ? (
        <HeatMap
          rows={read.value.data}
          count="visitors"
          active={active}
          onSelect={(code) =>
            router.push(
              `${path}${viewQuery(withFilter(state, "country", active === code ? null : code))}`,
              { scroll: false },
            )
          }
        />
      ) : (
        <p className="text-sm text-err">{read.error}</p>
      )}
    </section>
  );
}
