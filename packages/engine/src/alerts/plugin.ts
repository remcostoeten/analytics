import type { ChannelName } from "@remcostoeten/analytics-contract";
import { ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";

import type { EngineError } from "../errors";
import type { AlertStore } from "../ports/alerts";
import type { IssueStore } from "../ports/issues";
import { dispatchAlerts } from "./dispatch";
import type { DispatchSummary } from "./dispatch";
import type { AlertLinks } from "./links";
import { queueIssueAlerts } from "./queue-issues";
import type { ChannelDriver, RetryPolicy } from "./types";

export type AlertsOptions = { channels: ChannelDriver[]; retry?: Partial<RetryPolicy> };

export type AlertsPlugin = {
  name: "alerts";
  channels: ChannelDriver[];
  retry: Partial<RetryPolicy>;
  channel: (name: ChannelName) => Nullable<ChannelDriver>;
};

export type AlertsJob = { issues: IssueStore; alerts: AlertStore; links: AlertLinks };

export type AlertsRun = DispatchSummary & { queued: number };

/**
 * @name alerts
 * @description The alerts plugin: lists the channels this deployment allows and the retry policy
 * for all of them. With it in the config the API adds the alert routes and the alerts job; a
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
    channel: (name) => options.channels.find((channel) => channel.name === name) ?? null,
  };
}

/**
 * @name runAlerts
 * @description One run of the alerts job: queue the new issues and regressions, then dispatch
 * every due batch.
 *
 * @example
 * await runAlerts(plugin, { issues, alerts: store, links: apiLinks(apiUrl) }, new Date());
 */
export async function runAlerts(
  plugin: AlertsPlugin,
  job: AlertsJob,
  now: Date,
): Promise<Result<AlertsRun, EngineError>> {
  const queued = await queueIssueAlerts(job.issues, job.alerts, {
    links: job.links,
    channels: plugin.channels.map((channel) => channel.name),
    now,
  });
  if (!queued.ok) return queued;
  const sent = await dispatchAlerts(job.alerts, plugin, now);
  if (!sent.ok) return sent;
  return ok({ queued: queued.value.queued, ...sent.value });
}
