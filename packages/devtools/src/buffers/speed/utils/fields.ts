import type { Fields } from "../../../filter/parse";
import type { SpeedRow } from "../../../panel/runtime";

export const speedFields: Fields<SpeedRow> = {
  path: (row) => row.route,
  route: (row) => row.route,
  lcp: (row) => row.lcp,
  inp: (row) => row.inp,
  cls: (row) => row.cls,
  ttfb: (row) => row.ttfb,
  samples: (row) => row.samples,
  score: (row) => row.score,
};

export function speedText(row: SpeedRow) {
  return row.route;
}

export const speedColumns = "minmax(0,1fr) 150px 150px 150px 150px 72px";

export const speedHeader = ["route", "lcp p75", "inp p75", "cls p75", "ttfb p75", "samples"];
