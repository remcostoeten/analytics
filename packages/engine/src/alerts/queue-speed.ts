import type { ChannelName, SpeedAlert } from "@remcostoeten/analytics-contract";
import { ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";
import type { Nullable, ProjectID } from "@remcostoeten/analytics-shared/semantic";

import type { EngineError } from "../errors";
import type { AlertStore, QueuedEvent } from "../ports/alerts";
import type { SpeedScope, SpeedStore } from "../ports/speed";
import { rawVitalsFrom } from "../speed/retention";
import { scoreRating, statsScore } from "../speed/score";
import type { VitalName } from "../speed/score";
import type { AlertLinks } from "./links";

export type SpeedDrop = { points: number; below: number; baselineDays: number };

const dayMs = 86_400_000;
const minSamples = 20;
const percentile = 75;

/**
 * @name defaultSpeedDrop
 * @description When a `speed.drop` fires: yesterday's Real Experience Score is at least 10 points
 * under the 7 days before it, and under 90.
 *
 * @example
 * alerts({ channels, speedDrop: { ...defaultSpeedDrop, points: 15 } });
 */
export const defaultSpeedDrop: SpeedDrop = { points: 10, below: 90, baselineDays: 7 };

function scopeOf(project: ProjectID, from: Date, to: Date, now: Date): SpeedScope {
  return {
    projectIds: [project],
    from,
    to,
    device: "all",
    environment: "production",
    route: null,
    path: null,
    country: null,
    rawFrom: rawVitalsFrom(now),
  };
}

function worstMetric(
  before: { [Name in VitalName]?: number | null },
  after: { [Name in VitalName]?: number | null },
): Nullable<VitalName> {
  let worst: Nullable<VitalName> = null;
  let largest = 0;
  for (const [metric, score] of Object.entries(after)) {
    const previous = before[metric as VitalName];
    if (typeof score !== "number" || typeof previous !== "number") continue;
    if (previous - score > largest) {
      largest = previous - score;
      worst = metric as VitalName;
    }
  }
  return worst;
}

async function projectDrop(
  speed: SpeedStore,
  project: ProjectID,
  options: { links: AlertLinks; now: Date; drop: SpeedDrop },
): Promise<Result<Nullable<QueuedEvent>, EngineError>> {
  const { now, drop } = options;
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const from = new Date(to.getTime() - dayMs);
  const baselineFrom = new Date(from.getTime() - drop.baselineDays * dayMs);
  const [current, baseline] = await Promise.all([
    speed.summary(scopeOf(project, from, to, now), percentile),
    speed.summary(scopeOf(project, baselineFrom, from, now), percentile),
  ]);
  if (!current.ok) return current;
  if (!baseline.ok) return baseline;
  const after = statsScore(current.value, minSamples);
  const before = statsScore(baseline.value, minSamples);
  if (after.score === null || before.score === null) return ok(null);
  if (after.score >= drop.below || before.score - after.score < drop.points) return ok(null);
  const event: SpeedAlert = {
    name: "speed.drop",
    project,
    speed: {
      score: after.score,
      previous: before.score,
      rating: scoreRating(after.score),
      worst: worstMetric(before.scores, after.scores),
      samples: Math.max(0, ...current.value.map((stat) => stat.samples)),
      from: from.toISOString(),
      to: to.toISOString(),
      url: options.links.speed(project),
    },
  };
  return ok({ event, subject: `${project}@${from.toISOString().slice(0, 10)}` });
}

/**
 * @name queueSpeedAlerts
 * @description For each project with an enabled target subscribed to `speed.drop`, compares
 * yesterday's Real Experience Score (UTC, production, all devices, p75, metrics with at least 20
 * samples) with the days before it, and queues a `speed.drop` when it fell by the configured
 * points to under the configured score. The subject is the project and the day, so each drop
 * alerts once however often the job runs.
 *
 * @example
 * await queueSpeedAlerts(speed, alerts, { links, channels: ["mail"], now, drop: defaultSpeedDrop });
 */
export async function queueSpeedAlerts(
  speed: SpeedStore,
  alerts: AlertStore,
  options: { links: AlertLinks; channels: ChannelName[]; now: Date; drop: SpeedDrop },
): Promise<Result<{ queued: number; events: number }, EngineError>> {
  const projects = await alerts.subscribed("speed.drop", options.channels);
  if (!projects.ok) return projects;
  const events: QueuedEvent[] = [];
  for (const project of projects.value) {
    const found = await projectDrop(speed, project, options);
    if (!found.ok) return found;
    if (found.value) events.push(found.value);
  }
  if (events.length === 0) return ok({ queued: 0, events: 0 });
  const queued = await alerts.queue(events, options.channels, options.now);
  if (!queued.ok) return queued;
  return ok({ queued: queued.value.queued, events: events.length });
}
