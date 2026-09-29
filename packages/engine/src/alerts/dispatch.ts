import type { ChannelName } from "@remcostoeten/analytics-contract";
import { ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";

import type { EngineError } from "../errors";
import type { AlertStore, DeliveryBatch, DeliveryOutcome } from "../ports/alerts";
import { mergeRetry, nextAttempt } from "./retry";
import type { ChannelDriver, RetryPolicy } from "./types";

export type DispatchSummary = { sent: number; retrying: number; failed: number };

const batchLimit = 500;

function driverFor(channels: ChannelDriver[], name: ChannelName) {
  return channels.find((channel) => channel.name === name) ?? null;
}

function settled(batch: DeliveryBatch, error: EngineError, policy: RetryPolicy, now: Date) {
  return batch.deliveries.map((delivery): DeliveryOutcome => {
    const attempts = delivery.attempts + 1;
    const next = nextAttempt(policy, attempts, delivery.createdAt, now);
    return {
      id: delivery.id,
      status: next ? "pending" : "failed",
      attempts,
      nextAttemptAt: next,
      error: error.message,
      at: now,
    };
  });
}

async function sendBatch(
  batch: DeliveryBatch,
  channels: ChannelDriver[],
  retry: Partial<RetryPolicy>,
  now: Date,
): Promise<DeliveryOutcome[]> {
  const driver = driverFor(channels, batch.target.channel);
  if (!driver) {
    return settled(
      batch,
      {
        code: "VALIDATION_FAILED",
        message: `${batch.target.channel} is not enabled on this deployment`,
      },
      { ...mergeRetry(retry, {}), attempts: 0 },
      now,
    );
  }
  const policy = mergeRetry(retry, driver.retry);
  const ready = driver.ready();
  const sent = ready.ok ? await driver.send(batch, now) : ready;
  if (!sent.ok) return settled(batch, sent.error, policy, now);
  return batch.deliveries.map((delivery) => ({
    id: delivery.id,
    status: "sent",
    attempts: delivery.attempts + 1,
    nextAttemptAt: null,
    error: null,
    at: now,
  }));
}

/**
 * @name dispatchAlerts
 * @description Sends every due batch, one per target, through its channel at the same time, and
 * settles each delivery: `sent` on success, otherwise `pending` with the error and the next try
 * from the retry policy (the channel's over the plugin's), or `failed` once the policy ran out.
 * One failing target never holds back another.
 *
 * @example
 * await dispatchAlerts(store, { channels, retry: {} }, now); // ok({ sent: 3, retrying: 1, failed: 0 })
 */
export async function dispatchAlerts(
  store: AlertStore,
  options: { channels: ChannelDriver[]; retry: Partial<RetryPolicy> },
  now: Date,
): Promise<Result<DispatchSummary, EngineError>> {
  const due = await store.due(now, batchLimit);
  if (!due.ok) return due;
  const outcomes = (
    await Promise.all(
      due.value.map((batch) => sendBatch(batch, options.channels, options.retry, now)),
    )
  ).flat();
  if (outcomes.length === 0) return ok({ sent: 0, retrying: 0, failed: 0 });
  const saved = await store.settle(outcomes);
  if (!saved.ok) return saved;
  return ok({
    sent: outcomes.filter((outcome) => outcome.status === "sent").length,
    retrying: outcomes.filter((outcome) => outcome.status === "pending").length,
    failed: outcomes.filter((outcome) => outcome.status === "failed").length,
  });
}
