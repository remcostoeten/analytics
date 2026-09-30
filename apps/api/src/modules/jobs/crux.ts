import { engineError } from "@remcostoeten/analytics-engine";
import type {
  CheckTarget,
  EngineError,
  SpeedCheck,
  SpeedStore,
} from "@remcostoeten/analytics-engine";
import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";

import { minSamples } from "../speed/service";

export type CruxOptions = {
  key: string;
  send: (url: string, init: RequestInit) => Promise<Response>;
};

type Metric = SpeedCheck["metric"];

type CruxRecord = {
  record?: { metrics?: { [name: string]: { percentiles?: { p75?: number | string } } } };
};

const endpoint = "https://chromeuxreport.googleapis.com/v1/records:queryRecord";
const windowDays = 28;
const dayMs = 24 * 60 * 60 * 1000;
const flagAbove = 0.25;
const cruxNames: { [metric in Metric]: string } = {
  lcp: "largest_contentful_paint",
  inp: "interaction_to_next_paint",
  cls: "cumulative_layout_shift",
  fcp: "first_contentful_paint",
};
const metrics = Object.keys(cruxNames) as Metric[];

function originOf(domain: string) {
  return domain.startsWith("http") ? new URL(domain).origin : `https://${domain}`;
}

/**
 * @name speedGap
 * @description The relative gap between our p75 and the Chrome UX Report's, flagged above 25%;
 * without both values there is no gap and no flag.
 *
 * @example
 * speedGap(2710, 2400); // { gap: 0.129, flagged: false }
 */
function speedGap(ours: Nullable<number>, crux: Nullable<number>) {
  if (ours === null || crux === null || crux === 0) return { gap: null, flagged: false };
  const gap = Math.round((Math.abs(ours - crux) / crux) * 1000) / 1000;
  return { gap, flagged: gap > flagAbove };
}

async function cruxP75(
  options: CruxOptions,
  domain: string,
): Promise<Result<Nullable<{ [metric in Metric]?: number }>, EngineError>> {
  try {
    const response = await options.send(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": options.key },
      body: JSON.stringify({ origin: originOf(domain), metrics: Object.values(cruxNames) }),
    });
    if (response.status === 404) return ok(null);
    if (!response.ok) {
      return err(engineError("UNAVAILABLE", `The Chrome UX Report answered ${response.status}`));
    }
    const body = (await response.json()) as CruxRecord;
    const values: { [metric in Metric]?: number } = {};
    for (const metric of metrics) {
      const p75 = Number(body.record?.metrics?.[cruxNames[metric]]?.percentiles?.p75);
      if (Number.isFinite(p75)) values[metric] = p75;
    }
    return ok(values);
  } catch {
    return err(engineError("UNAVAILABLE", "The Chrome UX Report could not be reached"));
  }
}

/**
 * @name checkCrux
 * @description For each project, compares our p75 of LCP, INP, CLS and FCP over the last 28 days
 * (human traffic, all devices, at least 20 samples) with the Chrome UX Report for the project's
 * origin, and flags a gap over 25%. Origins Google has no data for get null values.
 *
 * @example
 * await checkCrux(speed, targets, { key, send: fetch }, new Date());
 */
export async function checkCrux(
  speed: SpeedStore,
  targets: CheckTarget[],
  options: CruxOptions,
  now: Date,
): Promise<Result<SpeedCheck[], EngineError>> {
  const checks: SpeedCheck[] = [];
  for (const target of targets) {
    const crux = await cruxP75(options, target.domain);
    if (!crux.ok) return crux;
    const ours = await speed.summary(
      {
        projectIds: [target.projectId],
        from: new Date(now.getTime() - windowDays * dayMs),
        to: now,
        device: "all",
        route: null,
        path: null,
        country: null,
      },
      75,
    );
    if (!ours.ok) return ours;
    const stats = new Map(ours.value.map((stat) => [stat.metric, stat]));
    for (const metric of metrics) {
      const stat = stats.get(metric);
      const mine = stat && stat.samples >= minSamples ? stat.value : null;
      const theirs = crux.value?.[metric] ?? null;
      checks.push({
        projectId: target.projectId,
        metric,
        checkedAt: now,
        ours: mine,
        crux: theirs,
        ...speedGap(mine, theirs),
      });
    }
  }
  return ok(checks);
}
