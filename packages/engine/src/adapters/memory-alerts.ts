import { ok } from "@remcostoeten/analytics-shared/result";
import type { ProjectID } from "@remcostoeten/analytics-shared/semantic";

import { webhookSecret } from "../alerts/sign-body";
import type {
  AlertStore,
  DeliveryBatch,
  DeliveryRecord,
  TargetChanges,
  TargetRecord,
  TargetSpec,
} from "../ports/alerts";
import type { Clock } from "../ports/clock";

type Stored = {
  targets: TargetRecord[];
  deliveries: DeliveryRecord[];
};

function sameSpec(a: TargetSpec, b: TargetSpec) {
  return (
    a.channel === b.channel &&
    a.enabled === b.enabled &&
    JSON.stringify([...a.on].sort()) === JSON.stringify([...b.on].sort()) &&
    JSON.stringify(a.settings) === JSON.stringify(b.settings)
  );
}

function failureOf(deliveries: DeliveryRecord[], target: TargetRecord) {
  const last = deliveries
    .filter((delivery) => delivery.targetId === target.id && delivery.attempts > 0)
    .at(-1);
  if (!last || last.status === "sent") return null;
  return last.lastError ?? "The last delivery failed";
}

/**
 * @name memoryAlerts
 * @description An `AlertStore` held in arrays, for tests: the same target changes, queueing with
 * one delivery per target, event and subject, due batches per target, and settling as the
 * Postgres store. `held` exposes the targets and deliveries.
 *
 * @example
 * const store = memoryAlerts(fixedClock(now));
 * await store.syncTargets("remcostoeten.nl", [spec]);
 */
export function memoryAlerts(
  clock: Clock,
  newSecret: () => string = webhookSecret,
): AlertStore & { held: Stored } {
  const stored: Stored = { targets: [], deliveries: [] };
  let sequence = 0;

  function withFailure(target: TargetRecord): TargetRecord {
    return { ...target, failure: failureOf(stored.deliveries, target) };
  }

  function write(project: ProjectID, specs: TargetSpec[], replace: boolean): TargetChanges {
    const changes: TargetChanges = { created: [], updated: [], removed: [], secrets: {} };
    const now = clock.now();
    for (const spec of specs) {
      const index = stored.targets.findIndex(
        (target) => target.projectId === project && target.name === spec.name,
      );
      const current = stored.targets[index];
      const secret =
        spec.channel === "webhook" && current?.channel === "webhook" ? current.secret : null;
      const fresh = spec.channel === "webhook" && !secret ? newSecret() : null;
      if (fresh) changes.secrets[spec.name] = fresh;
      if (current && sameSpec(current, spec) && !fresh) continue;
      const record: TargetRecord = {
        ...spec,
        id: current?.id ?? `alt_${++sequence}`,
        projectId: project,
        secret: spec.channel === "webhook" ? (fresh ?? secret) : null,
        failure: null,
        createdAt: current?.createdAt ?? now,
        updatedAt: now,
      };
      if (current) {
        stored.targets[index] = record;
        changes.updated.push(spec.name);
      } else {
        stored.targets.push(record);
        changes.created.push(spec.name);
      }
    }
    if (!replace) return changes;
    const wanted = new Set(specs.map((spec) => spec.name));
    const removed = stored.targets.filter(
      (target) => target.projectId === project && !wanted.has(target.name),
    );
    for (const target of removed) changes.removed.push(target.name);
    const gone = new Set(removed.map((target) => target.id));
    stored.targets = stored.targets.filter((target) => !gone.has(target.id));
    stored.deliveries = stored.deliveries.filter((delivery) => !gone.has(delivery.targetId));
    return changes;
  }

  return {
    held: stored,
    targets: async (project) =>
      ok(
        stored.targets
          .filter((target) => target.projectId === project)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(withFailure),
      ),
    target: async (project, name) => {
      const found = stored.targets.find(
        (target) => target.projectId === project && target.name === name,
      );
      return ok(found ? withFailure(found) : null);
    },
    syncTargets: async (project, targets) => ok(write(project, targets, true)),
    saveTarget: async (project, target) => ok(write(project, [target], false)),
    removeTarget: async (project, name) => {
      const found = stored.targets.find(
        (target) => target.projectId === project && target.name === name,
      );
      if (!found) return ok(false);
      stored.targets = stored.targets.filter((target) => target.id !== found.id);
      stored.deliveries = stored.deliveries.filter((delivery) => delivery.targetId !== found.id);
      return ok(true);
    },
    rotateSecret: async (project, name) => {
      const index = stored.targets.findIndex(
        (target) =>
          target.projectId === project && target.name === name && target.channel === "webhook",
      );
      const found = stored.targets[index];
      if (!found) return ok(null);
      const secret = newSecret();
      stored.targets[index] = { ...found, secret, updatedAt: clock.now() };
      return ok(secret);
    },
    queue: async (events, channels, now) => {
      let queued = 0;
      for (const { event, subject } of events) {
        const targets = stored.targets.filter(
          (target) =>
            target.projectId === event.project &&
            target.enabled &&
            target.on.includes(event.name) &&
            channels.includes(target.channel),
        );
        for (const target of targets) {
          const exists = stored.deliveries.some(
            (delivery) =>
              delivery.targetId === target.id &&
              delivery.event.name === event.name &&
              delivery.subject === subject,
          );
          if (exists) continue;
          stored.deliveries.push({
            id: String(++sequence),
            targetId: target.id,
            target: target.name,
            channel: target.channel,
            event,
            subject,
            status: "pending",
            attempts: 0,
            nextAttemptAt: now,
            lastError: null,
            sentAt: null,
            createdAt: now,
          });
          queued += 1;
        }
      }
      return ok({ queued });
    },
    due: async (now, limit) => {
      const batches = new Map<string, DeliveryBatch>();
      const due = stored.deliveries
        .filter(
          (delivery) =>
            delivery.status === "pending" &&
            delivery.nextAttemptAt !== null &&
            delivery.nextAttemptAt.getTime() <= now.getTime(),
        )
        .slice(0, limit);
      for (const delivery of due) {
        const target = stored.targets.find((candidate) => candidate.id === delivery.targetId);
        if (!target?.enabled) continue;
        const batch = batches.get(target.id) ?? { target, deliveries: [] };
        batch.deliveries.push(delivery);
        batches.set(target.id, batch);
      }
      return ok([...batches.values()]);
    },
    settle: async (outcomes) => {
      for (const outcome of outcomes) {
        const index = stored.deliveries.findIndex((delivery) => delivery.id === outcome.id);
        const delivery = stored.deliveries[index];
        if (!delivery) continue;
        stored.deliveries[index] = {
          ...delivery,
          status: outcome.status,
          attempts: outcome.attempts,
          nextAttemptAt: outcome.status === "pending" ? outcome.nextAttemptAt : null,
          lastError: outcome.error,
          sentAt: outcome.status === "sent" ? outcome.at : delivery.sentAt,
        };
      }
      return ok(null);
    },
    deliveries: async (project, status, page) => {
      const ids = new Set(
        stored.targets.filter((target) => target.projectId === project).map((target) => target.id),
      );
      const matching = stored.deliveries
        .filter((delivery) => ids.has(delivery.targetId) && (!status || delivery.status === status))
        .reverse();
      return ok({
        rows: matching.slice(page.offset, page.offset + page.limit),
        total: matching.length,
      });
    },
    pending: async () =>
      ok(stored.deliveries.filter((delivery) => delivery.status === "pending").length),
    failing: async () =>
      ok(
        stored.targets
          .map(withFailure)
          .filter((target) => target.failure !== null)
          .map((target) => ({
            projectId: target.projectId,
            name: target.name,
            channel: target.channel,
            reason: target.failure,
          })),
      ),
  };
}
