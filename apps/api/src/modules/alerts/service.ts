import type {
  AlertDelivery,
  AlertTarget,
  AlertsStatus,
  ChannelName,
  DeliveryStatus,
  IssueAlert,
  TargetInput,
  TargetState,
} from "@remcostoeten/analytics-contract";
import { engineError } from "@remcostoeten/analytics-engine";
import type {
  AlertStore,
  DeliveryRecord,
  EngineError,
  TargetRecord,
  TargetSpec,
} from "@remcostoeten/analytics-engine";
import { defaultAlertEvents } from "@remcostoeten/analytics-engine/alerts";
import type { AlertLinks, AlertsPlugin } from "@remcostoeten/analytics-engine/alerts";
import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";
import type { Nullable, ProjectID } from "@remcostoeten/analytics-shared/semantic";

import { nextCursor, readPage } from "../reads/params";

export type AlertsDeps = { plugin: AlertsPlugin; store: AlertStore; links: AlertLinks };

type Reply<Value> = Promise<Result<Value, EngineError>>;

const statuses = new Set<string>(["pending", "sent", "failed"]);

function isStatus(value: string): value is DeliveryStatus {
  return statuses.has(value);
}

function invalid(path: string, message: string) {
  return err<EngineError>({
    code: "VALIDATION_FAILED",
    message,
    details: { fields: [{ path, message }] },
  });
}

function toSpec(input: TargetInput): TargetSpec {
  const base = {
    name: input.name ?? input.channel,
    on: input.on ?? [...defaultAlertEvents],
    enabled: input.enabled ?? true,
  };
  if (input.channel === "mail") return { ...base, channel: "mail", settings: { to: input.to } };
  return { ...base, channel: input.channel, settings: { url: input.url } };
}

function checkSpecs(
  plugin: AlertsPlugin,
  inputs: TargetInput[],
  path: (index: number) => string,
): Result<TargetSpec[], EngineError> {
  const seen = new Set<string>();
  const specs: TargetSpec[] = [];
  for (const [index, input] of inputs.entries()) {
    if (!plugin.channel(input.channel)) {
      return invalid(
        `${path(index)}/channel`,
        `${input.channel} is not enabled on this deployment`,
      );
    }
    const spec = toSpec(input);
    if (seen.has(spec.name)) {
      return invalid(`${path(index)}/name`, `two targets are named ${spec.name}`);
    }
    seen.add(spec.name);
    specs.push(spec);
  }
  return ok(specs);
}

function stateOf(plugin: AlertsPlugin, target: TargetRecord): [TargetState, Nullable<string>] {
  if (!target.enabled) return ["paused", "The target is disabled"];
  const driver = plugin.channel(target.channel);
  if (!driver) return ["paused", `${target.channel} is not enabled on this deployment`];
  const ready = driver.ready();
  if (!ready.ok) return ["paused", ready.error.message];
  if (target.failure) return ["failing", target.failure];
  return ["active", null];
}

function shapeTarget(plugin: AlertsPlugin, target: TargetRecord): AlertTarget {
  const [state, stateReason] = stateOf(plugin, target);
  const base = {
    id: target.id,
    project: target.projectId,
    name: target.name,
    on: target.on,
    enabled: target.enabled,
    state,
    stateReason,
    createdAt: target.createdAt.toISOString(),
    updatedAt: target.updatedAt.toISOString(),
  };
  if (target.channel === "mail") return { ...base, channel: "mail", to: target.settings.to };
  return { ...base, channel: target.channel, url: target.settings.url };
}

function shapeDelivery(delivery: DeliveryRecord): AlertDelivery {
  return {
    id: delivery.id,
    target: delivery.target,
    channel: delivery.channel,
    event: delivery.event.name,
    subject: delivery.subject,
    status: delivery.status,
    attempts: delivery.attempts,
    nextAttemptAt: delivery.nextAttemptAt?.toISOString() ?? null,
    lastError: delivery.lastError,
    sentAt: delivery.sentAt?.toISOString() ?? null,
    createdAt: delivery.createdAt.toISOString(),
    payload: delivery.event,
  };
}

async function found(deps: AlertsDeps, project: ProjectID, name: string): Reply<TargetRecord> {
  const target = await deps.store.target(project, name);
  if (!target.ok) return target;
  return target.value
    ? ok(target.value)
    : err(engineError("NOT_FOUND", `No alert target named ${name}`));
}

/**
 * @name listTargets
 * @description A project's alert targets by name, each with its state: `paused` when disabled or
 * its channel is off or not ready, `failing` when its last delivery failed, else `active`.
 *
 * @example
 * await listTargets(deps, "remcostoeten.nl");
 */
export async function listTargets(deps: AlertsDeps, project: ProjectID): Reply<AlertTarget[]> {
  const targets = await deps.store.targets(project);
  if (!targets.ok) return targets;
  return ok(targets.value.map((target) => shapeTarget(deps.plugin, target)));
}

/**
 * @name syncTargets
 * @description Makes a project's targets match the list: adds what is missing, updates what
 * changed and removes what is not listed. A target on a channel the config does not enable, or
 * two with the same name, answer `VALIDATION_FAILED` with the field's path.
 *
 * @example
 * await syncTargets(deps, "remcostoeten.nl", [{ channel: "mail", to: ["remco@gmail.com"] }]);
 */
export async function syncTargets(deps: AlertsDeps, project: ProjectID, inputs: TargetInput[]) {
  const specs = checkSpecs(deps.plugin, inputs, (index) => `/targets/${index}`);
  if (!specs.ok) return specs;
  return deps.store.syncTargets(project, specs.value);
}

/**
 * @name setTarget
 * @description Creates or replaces the one target named in the path. A `name` in the body must
 * match it.
 *
 * @example
 * await setTarget(deps, "remcostoeten.nl", "ops", { channel: "webhook", url: "https://ops.example.com/hook" });
 */
export async function setTarget(
  deps: AlertsDeps,
  project: ProjectID,
  name: string,
  input: TargetInput,
) {
  if (input.name !== undefined && input.name !== name) {
    return invalid("/name", `the name in the body must be ${name}`);
  }
  const specs = checkSpecs(deps.plugin, [{ ...input, name }], () => "");
  if (!specs.ok) return specs;
  const [spec] = specs.value;
  if (!spec) return invalid("", "no target given");
  return deps.store.saveTarget(project, spec);
}

/**
 * @name removeTarget
 * @description Removes one target and its delivery history; `NOT_FOUND` when there is none.
 *
 * @example
 * await removeTarget(deps, "remcostoeten.nl", "ops");
 */
export async function removeTarget(
  deps: AlertsDeps,
  project: ProjectID,
  name: string,
): Reply<null> {
  const removed = await deps.store.removeTarget(project, name);
  if (!removed.ok) return removed;
  return removed.value ? ok(null) : err(engineError("NOT_FOUND", `No alert target named ${name}`));
}

/**
 * @name rotateTarget
 * @description Gives a webhook target a new signing secret and answers it; it is shown only here.
 *
 * @example
 * await rotateTarget(deps, "remcostoeten.nl", "ops"); // ok({ name: "ops", secret: "whsec_..." })
 */
export async function rotateTarget(
  deps: AlertsDeps,
  project: ProjectID,
  name: string,
): Reply<{ name: string; secret: string }> {
  const target = await found(deps, project, name);
  if (!target.ok) return target;
  if (target.value.channel !== "webhook") {
    return err(engineError("VALIDATION_FAILED", "Only webhook targets have a signing secret"));
  }
  const rotated = await deps.store.rotateSecret(project, name);
  if (!rotated.ok) return rotated;
  if (!rotated.value) return err(engineError("NOT_FOUND", `No alert target named ${name}`));
  return ok({ name, secret: rotated.value });
}

function sampleEvent(deps: AlertsDeps, project: ProjectID, now: Date): IssueAlert {
  const id = "iss_sample";
  return {
    name: "issue.new",
    project,
    issue: {
      id,
      title: "Sample alert: TypeError: Cannot read properties of undefined (reading 'map')",
      culprit: "app/page.tsx",
      level: "error",
      count: 1,
      firstSeen: now.toISOString(),
      lastSeen: now.toISOString(),
      lastRelease: null,
      url: deps.links.issue(project, id),
    },
  };
}

/**
 * @name testTarget
 * @description Sends one sample alert to a target now, outside the queue, and answers whether the
 * provider accepted it and what it said, so a wrong password or URL shows up during setup.
 *
 * @example
 * await testTarget(deps, "remcostoeten.nl", "mail", new Date()); // ok({ delivered: false, message: "SMTP ...: AUTH answered 535 ..." })
 */
export async function testTarget(
  deps: AlertsDeps,
  project: ProjectID,
  name: string,
  now: Date,
): Reply<{ name: string; channel: ChannelName; delivered: boolean; message: string }> {
  const target = await found(deps, project, name);
  if (!target.ok) return target;
  const driver = deps.plugin.channel(target.value.channel);
  if (!driver) {
    return err(
      engineError("VALIDATION_FAILED", `${target.value.channel} is not enabled on this deployment`),
    );
  }
  const event = sampleEvent(deps, project, now);
  const ready = driver.ready();
  const sent = ready.ok
    ? await driver.send(
        {
          target: target.value,
          deliveries: [
            {
              id: "test",
              targetId: target.value.id,
              target: name,
              channel: target.value.channel,
              event,
              subject: "test",
              status: "pending",
              attempts: 0,
              nextAttemptAt: now,
              lastError: null,
              sentAt: null,
              createdAt: now,
            },
          ],
        },
        now,
      )
    : ready;
  return ok({
    name,
    channel: target.value.channel,
    delivered: sent.ok,
    message: sent.ok ? "The sample alert was sent" : sent.error.message,
  });
}

/**
 * @name listDeliveries
 * @description A project's delivery history, newest first, optionally by `status`, paged with a
 * cursor.
 *
 * @example
 * await listDeliveries(deps, "remcostoeten.nl", new URLSearchParams("status=failed"));
 */
export async function listDeliveries(
  deps: AlertsDeps,
  project: ProjectID,
  params: URLSearchParams,
): Reply<{ data: AlertDelivery[]; nextCursor: Nullable<string> }> {
  const status = params.get("status");
  if (status !== null && !isStatus(status)) {
    return invalid("/status", "status must be pending, sent or failed");
  }
  const page = readPage(params);
  if (!page.ok) return page;
  const rows = await deps.store.deliveries(project, status, page.value);
  if (!rows.ok) return rows;
  return ok({
    data: rows.value.rows.map(shapeDelivery),
    nextCursor: nextCursor(page.value.offset, rows.value.rows.length, rows.value.total),
  });
}

/**
 * @name alertsStatus
 * @description The enabled channels and whether each is ready, the mail transport without
 * secrets, the number of pending deliveries and the targets whose last delivery failed.
 *
 * @example
 * await alertsStatus(deps);
 */
export async function alertsStatus(deps: AlertsDeps): Reply<AlertsStatus["data"]> {
  const pending = await deps.store.pending();
  if (!pending.ok) return pending;
  const failing = await deps.store.failing();
  if (!failing.ok) return failing;
  const transport = deps.plugin.channels
    .map((channel) => channel.describe())
    .find((one) => one !== null);
  return ok({
    channels: deps.plugin.channels.map((channel) => {
      const ready = channel.ready();
      return {
        name: channel.name,
        ready: ready.ok,
        problem: ready.ok ? null : ready.error.message,
      };
    }),
    transport: transport ?? null,
    pending: pending.value,
    failing: failing.value.map((target) => ({
      project: target.projectId,
      name: target.name,
      channel: target.channel,
      reason: target.reason,
    })),
  });
}
