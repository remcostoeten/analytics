import type { ChannelName } from "@spoar/contract";
import { ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";
import type { Nullable } from "@spoar/shared/semantic";

import type { EngineError } from "../errors";
import type { AlertStore } from "../ports/alerts";
import type { IssueStore } from "../ports/issues";
import type { SpeedStore } from "../ports/speed";
import { dispatchAlerts } from "./dispatch";
import type { DispatchSummary } from "./dispatch";
import type { AlertLinks } from "./links";
import { queueIssueAlerts } from "./queue-issues";
import { defaultSpeedDrop, queueSpeedAlerts } from "./queue-speed";
import type { SpeedDrop } from "./queue-speed";
import type { ChannelDriver, RetryPolicy } from "./types";

export type AlertsOptions = {
  channels: ChannelDriver[];
  retry?: Partial<RetryPolicy>;
  speedDrop?: Partial<SpeedDrop>;
};

export type AlertsPlugin = {
  name: "alerts";
  channels: ChannelDriver[];
  retry: Partial<RetryPolicy>;
  speedDrop: SpeedDrop;
  channel: (name: ChannelName) => Nullable<ChannelDriver>;
};

export type AlertsJob = {
  issues: IssueStore;
  speed: SpeedStore;
  alerts: AlertStore;
  links: AlertLinks;
};

export type AlertsRun = DispatchSummary & { queued: number };

/**
 * @name alerts
 * @description The alerts plugin: lists the channels this deployment allows, the retry policy
 * for all of them, and when a `speed.drop` fires (`speedDrop`, over `defaultSpeedDrop`). With it in the config the API adds the alert routes and the alerts job; a
 * channel left out answers `VALIDATION_FAILED` for targets on it.
 *
 * @example
 * defineConfig({ plugins: [alerts({ channels: [webhook(), discord()], retry: { maxAge: "6h" } })] });
 */
export function alerts(options: AlertsOptions): AlertsPlugin {
  return {
    name: "alerts",
    channels: options.channels,
    retry: options.retry ?? {},
    speedDrop: { ...defaultSpeedDrop, ...options.speedDrop },
    channel: (name) => options.channels.find((channel) => channel.name === name) ?? null,
  };
}

/**
 * @name runAlerts
 * @description One run of the alerts job: queue the new issues, regressions and speed drops, then
 * dispatch every due batch.
 *
 * @example
 * await runAlerts(plugin, { issues, speed, alerts: store, links: apiLinks(apiUrl) }, new Date());
 */
export async function runAlerts(
  plugin: AlertsPlugin,
  job: AlertsJob,
  now: Date,
): Promise<Result<AlertsRun, EngineError>> {
  const channels = plugin.channels.map((channel) => channel.name);
  const queued = await queueIssueAlerts(job.issues, job.alerts, {
    links: job.links,
    channels,
    now,
  });
  if (!queued.ok) return queued;
  const slower = await queueSpeedAlerts(job.speed, job.alerts, {
    links: job.links,
    channels,
    now,
    drop: plugin.speedDrop,
  });
  if (!slower.ok) return slower;
  const sent = await dispatchAlerts(job.alerts, plugin, now);
  if (!sent.ok) return sent;
  return ok({ queued: queued.value.queued + slower.value.queued, ...sent.value });
}
