import type { ChannelName, IssueAlert } from "@remcostoeten/analytics-contract";
import { ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";

import type { EngineError } from "../errors";
import type { AlertStore, QueuedEvent } from "../ports/alerts";
import type { IssueStore, PendingAlert } from "../ports/issues";
import type { AlertLinks } from "./links";

const batchSize = 100;

function issueEvent(pending: PendingAlert, links: AlertLinks): QueuedEvent {
  const { issue } = pending;
  const event: IssueAlert = {
    name: pending.kind === "new" ? "issue.new" : "issue.regression",
    project: issue.projectId,
    issue: {
      id: issue.id,
      title: issue.title,
      culprit: issue.culprit,
      level: issue.level,
      count: issue.count,
      firstSeen: issue.firstSeen.toISOString(),
      lastSeen: issue.lastSeen.toISOString(),
      lastRelease: issue.lastRelease,
      url: links.issue(issue.projectId, issue.id),
    },
  };
  const subject =
    pending.kind === "new"
      ? issue.id
      : `${issue.id}@${(pending.regressedAt ?? issue.lastSeen).toISOString()}`;
  return { event, subject };
}

/**
 * @name queueIssueAlerts
 * @description Turns new issues and regressions not yet queued, up to 100 per run, into
 * `issue.new` and `issue.regression` events, queues one delivery per enabled target subscribed
 * to each on an enabled channel, and marks the issues queued. The subject of a regression holds
 * its `regressed_at`, so every regression alerts once and a retried run never queues twice.
 *
 * @example
 * await queueIssueAlerts(issues, alerts, { links, channels: ["mail", "webhook"], now });
 */
export async function queueIssueAlerts(
  issues: IssueStore,
  alerts: AlertStore,
  options: { links: AlertLinks; channels: ChannelName[]; now: Date },
): Promise<Result<{ queued: number; events: number }, EngineError>> {
  const pending = await issues.pendingAlerts(batchSize);
  if (!pending.ok) return pending;
  if (pending.value.length === 0) return ok({ queued: 0, events: 0 });
  const queued = await alerts.queue(
    pending.value.map((alert) => issueEvent(alert, options.links)),
    options.channels,
    options.now,
  );
  if (!queued.ok) return queued;
  const marked = await issues.markAlerted(pending.value.map((alert) => alert.issue));
  if (!marked.ok) return marked;
  return ok({ queued: queued.value.queued, events: pending.value.length });
}
