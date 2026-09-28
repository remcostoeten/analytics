import type { Nullable } from "@remcostoeten/analytics-shared/semantic";

import type { EventDraft } from "../draft";
import type { VitalName, VitalRating } from "./score";

export type VitalRow = {
  id: string;
  projectId: string;
  sessionId: Nullable<string>;
  ts: Date;
  metric: VitalName;
  value: number;
  rating: VitalRating;
  route: Nullable<string>;
  path: string;
  device: string;
  country: Nullable<string>;
  connection: Nullable<string>;
  selector: Nullable<string>;
  sampleRate: number;
  navigationType: Nullable<string>;
  botScore: number;
};

const metrics = new Set<string>(["lcp", "inp", "cls", "fcp", "ttfb"]);
const ratings = new Set<string>(["good", "needs-improvement", "poor"]);
const humanScore = 50;
const maxTimingMs = 120_000;
const maxShift = 10;

function text(value: unknown): Nullable<string> {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function device(draft: EventDraft) {
  const type = draft.enrichment.device?.type ?? "unknown";
  return type === "tablet" ? "mobile" : type;
}

/**
 * @name vitalRow
 * @description The `web_vitals` row for a `web_vital` event, or null when it should not count:
 * bots, internal, localhost and preview traffic, unknown metrics or ratings, and impossible
 * values (negative, CLS above 10, a timing above 120 s). The row id is the project plus the
 * web-vitals metric id, so a later report of the same INP or CLS replaces the earlier one.
 * Tablets count as mobile.
 *
 * @example
 * const row = vitalRow(draft);
 */
export function vitalRow(draft: EventDraft): VitalRow | null {
  const { event, flags } = draft;
  if (event.name !== "web_vital") return null;
  if (draft.bot.score >= humanScore || flags.internal || flags.localhost || flags.preview) {
    return null;
  }
  const props = event.props;
  const { metric, value, rating, id } = props;
  if (typeof metric !== "string" || !metrics.has(metric)) return null;
  if (typeof rating !== "string" || !ratings.has(rating)) return null;
  if (typeof id !== "string" || id.length === 0) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  if (metric === "cls" ? value > maxShift : value > maxTimingMs) return null;
  const sampleRate = typeof props.sampleRate === "number" ? props.sampleRate : 1;
  return {
    id: `${draft.projectId}:${id}`,
    projectId: draft.projectId,
    sessionId: event.session,
    ts: new Date(draft.ts),
    metric: metric as VitalName,
    value,
    rating: rating as VitalRating,
    route: text(props.route) ?? event.page.route ?? null,
    path: event.page.path,
    device: device(draft),
    country: draft.enrichment.geo?.country ?? null,
    connection: text(props.connection),
    selector: text(props.selector),
    sampleRate: sampleRate > 0 && sampleRate <= 1 ? sampleRate : 1,
    navigationType: text(props.navigationType),
    botScore: draft.bot.score,
  };
}
