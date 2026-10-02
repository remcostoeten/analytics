import {
  AlertDeliveryList,
  AlertsStatus,
  AlertTargetList,
  RotatedSecret,
  SyncTargets,
  TargetChangesResponse,
  TargetInput,
  TargetName,
  TargetTest,
} from "@spoar/contract";
import type { EngineError } from "@spoar/engine";
import type { Result } from "@spoar/shared/result";
import { Elysia, t } from "elysia";

import type { AccessDeps } from "../../access/types";
import { access } from "../../plugins/access";
import { failure } from "../../plugins/error-handler";
import { errorResponses } from "../../plugins/error-responses";
import {
  alertsStatus,
  listDeliveries,
  listTargets,
  removeTarget,
  rotateTarget,
  setTarget,
  syncTargets,
  testTarget,
} from "./service";
import type { AlertsDeps } from "./service";

type Set = { status?: unknown; headers: { [name: string]: unknown } };

const tags = ["Alerts"];
const named = t.Object({ project: t.String(), name: TargetName });

/**
 * @name alertsModule
 * @description The alerts plugin's routes, added only when `alerts()` is in the config: a
 * project's targets under `/projects/:project/alerts` (list, `sync`, set, remove, test, rotate)
 * and its delivery history for project admins, and `/admin/alerts/status` for organization admins.
 *
 * @example
 * app.use(alertsModule(deps, { plugin, store, links }, clock, docsBase));
 */
export function alertsModule(
  deps: AccessDeps,
  alerts: AlertsDeps,
  clock: () => Date,
  docsBase: string,
) {
  function answer<Value>(result: Result<Value, EngineError>, set: Set) {
    if (result.ok) return { ok: true as const, value: result.value };
    const failed = failure(result.error, set.headers, docsBase);
    set.status = failed.status;
    return { ok: false as const, body: failed.body };
  }

  function data<Value>(result: Result<Value, EngineError>, set: Set) {
    const answered = answer(result, set);
    return answered.ok ? { data: answered.value } : answered.body;
  }

  return new Elysia({ name: "alerts" })
    .use(access(deps, docsBase))
    .get(
      "/projects/:project/alerts/targets",
      async ({ project, set }) => {
        const answered = answer(await listTargets(alerts, project?.id ?? ""), set);
        return answered.ok ? { data: answered.value, nextCursor: null } : answered.body;
      },
      {
        access: "admin",
        response: { 200: AlertTargetList, ...errorResponses },
        detail: {
          summary: "Alert targets",
          description:
            "The project's targets by name. `state` is `paused` when a target is disabled or its channel is off or not ready, `failing` when its last delivery failed, with the reason in `stateReason`.",
          tags,
        },
      },
    )
    .put(
      "/projects/:project/alerts/targets",
      async ({ project, body, set }) =>
        data(await syncTargets(alerts, project?.id ?? "", body.targets), set),
      {
        access: "admin",
        body: SyncTargets,
        response: { 200: TargetChangesResponse, ...errorResponses },
        detail: {
          summary: "Sync alert targets",
          description:
            "Makes the project's targets match the list: adds what is missing, updates what changed and removes what is not listed, so sending it twice changes nothing. `name` defaults to the channel, `on` to every issue event and `enabled` to true. `secrets` holds the signing secret of each new webhook target, shown only here and after `rotate`. A channel the deployment does not enable answers `VALIDATION_FAILED`.",
          tags,
        },
      },
    )
    .put(
      "/projects/:project/alerts/targets/:name",
      async ({ project, params, body, set }) =>
        data(await setTarget(alerts, project?.id ?? "", params.name, body), set),
      {
        access: "admin",
        params: named,
        body: TargetInput,
        response: { 200: TargetChangesResponse, ...errorResponses },
        detail: {
          summary: "Set one alert target",
          description: "Creates or replaces the target named in the path.",
          tags,
        },
      },
    )
    .delete(
      "/projects/:project/alerts/targets/:name",
      async ({ project, params, set, status }) => {
        const answered = answer(await removeTarget(alerts, project?.id ?? "", params.name), set);
        return answered.ok ? status(204, undefined) : answered.body;
      },
      {
        access: "admin",
        params: named,
        response: { 204: t.Void(), ...errorResponses },
        detail: {
          summary: "Remove an alert target",
          description: "Removes the target and its delivery history.",
          tags,
        },
      },
    )
    .post(
      "/projects/:project/alerts/targets/:name/test",
      async ({ project, params, set }) =>
        data(await testTarget(alerts, project?.id ?? "", params.name, clock()), set),
      {
        access: "admin",
        params: named,
        response: { 200: TargetTest, ...errorResponses },
        detail: {
          summary: "Test an alert target",
          description:
            "Sends a sample alert to the target now, outside the queue, and answers whether the provider accepted it and what it said.",
          tags,
        },
      },
    )
    .post(
      "/projects/:project/alerts/targets/:name/rotate",
      async ({ project, params, set }) =>
        data(await rotateTarget(alerts, project?.id ?? "", params.name), set),
      {
        access: "admin",
        params: named,
        response: { 200: RotatedSecret, ...errorResponses },
        detail: {
          summary: "Rotate a webhook secret",
          description:
            "Gives a webhook target a new signing secret, shown only in this answer. The old one stops working at once.",
          tags,
        },
      },
    )
    .get(
      "/projects/:project/alerts/deliveries",
      async ({ project, request, set }) => {
        const answered = answer(
          await listDeliveries(alerts, project?.id ?? "", new URL(request.url).searchParams),
          set,
        );
        return answered.ok ? answered.value : answered.body;
      },
      {
        access: "admin",
        response: { 200: AlertDeliveryList, ...errorResponses },
        detail: {
          summary: "Alert deliveries",
          description:
            "The delivery history, newest first: `pending` ones with their attempts, last error and next try, `sent` and `failed` ones. `status` narrows it; `limit` and `cursor` page it.",
          tags,
          parameters: [
            {
              name: "status",
              in: "query",
              schema: { type: "string", enum: ["pending", "sent", "failed"] },
            },
            { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
            { name: "cursor", in: "query", schema: { type: "string" } },
          ],
        },
      },
    )
    .get(
      "/admin/alerts/status",
      async ({ set }) => {
        set.headers["cache-control"] = "private, no-store";
        return data(await alertsStatus(alerts), set);
      },
      {
        access: "admin",
        response: { 200: AlertsStatus, ...errorResponses },
        detail: {
          summary: "Alerts status",
          description:
            "The enabled channels and whether each is ready, the mail transport without secrets, the number of pending deliveries and the targets whose last delivery failed.",
          tags,
        },
      },
    );
}
