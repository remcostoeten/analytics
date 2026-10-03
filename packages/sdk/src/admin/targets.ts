import type {
  AlertDeliveryList,
  AlertsStatus,
  AlertTarget,
  AlertTargetList,
  DeliveriesQuery,
  RotatedSecret,
  TargetChanges,
  TargetChangesResponse,
  TargetTest,
} from "@spoar/contract";
import type { Json } from "@spoar/shared/http";

import type {
  AdminResult,
  AdminSend,
  DiscordTarget,
  MailOptions,
  MailTarget,
  Target,
  UniqueNames,
  UrlOptions,
  WebhookTarget,
} from "./types";

export type AlertsAdmin<Projects extends string> = {
  sync: <const Targets extends readonly Target[]>(
    project: Projects,
    targets: UniqueNames<Targets>,
  ) => AdminResult<TargetChanges>;
  list: (project: Projects) => AdminResult<AlertTarget[]>;
  set: (project: Projects, target: Target) => AdminResult<TargetChanges>;
  remove: (project: Projects, name: string) => AdminResult<null>;
  test: (project: Projects, name: string) => AdminResult<TargetTest["data"]>;
  rotate: (project: Projects, name: string) => AdminResult<RotatedSecret["data"]>;
  deliveries: (project: Projects, query?: DeliveriesQuery) => AdminResult<AlertDeliveryList>;
  status: () => AdminResult<AlertsStatus["data"]>;
};

/**
 * @name mail
 * @description A mail target: the addresses that get this project's alerts. `name` defaults to
 * `mail`, `on` to every issue event and `enabled` to `true`.
 *
 * @example
 * mail({ to: ["remco@gmail.com"], on: ["issue.regression"] });
 */
export function mail<const Name extends string>(
  options: MailOptions & { name: Name },
): MailTarget<Name>;
export function mail(options: MailOptions & { name?: undefined }): MailTarget<"mail">;
export function mail(options: MailOptions & { name?: string }): MailTarget {
  return { ...options, channel: "mail" };
}

/**
 * @name webhook
 * @description A webhook target: an `https://` URL that gets each batch of alerts as a signed
 * `WebhookBody`. `name` defaults to `webhook`; the signing secret comes back from `sync` or
 * `rotate`.
 *
 * @example
 * webhook({ name: "ops", url: "https://ops.example.com/hooks/analytics" });
 */
export function webhook<const Name extends string>(
  options: UrlOptions & { name: Name },
): WebhookTarget<Name>;
export function webhook(options: UrlOptions & { name?: undefined }): WebhookTarget<"webhook">;
export function webhook(options: UrlOptions & { name?: string }): WebhookTarget {
  return { ...options, channel: "webhook" };
}

/**
 * @name discord
 * @description A Discord target: a Discord webhook URL that gets each batch of alerts as one
 * message. `name` defaults to `discord`.
 *
 * @example
 * discord({ url: "https://discord.com/api/webhooks/1/abc", on: ["issue.regression"] });
 */
export function discord<const Name extends string>(
  options: UrlOptions & { name: Name },
): DiscordTarget<Name>;
export function discord(options: UrlOptions & { name?: undefined }): DiscordTarget<"discord">;
export function discord(options: UrlOptions & { name?: string }): DiscordTarget {
  return { ...options, channel: "discord" };
}

function targetBody(target: Target) {
  const body: { [key: string]: Json } = { channel: target.channel };
  if (target.name !== undefined) body.name = target.name;
  if (target.on !== undefined) body.on = target.on;
  if (target.enabled !== undefined) body.enabled = target.enabled;
  if (target.channel === "mail") body.to = target.to;
  else body.url = target.url;
  return body;
}

/**
 * @name alertsAdmin
 * @description The `admin.alerts` methods over the alert routes of one API: `sync` makes a
 * project's targets match a list, the others read or change one target by name.
 *
 * @example
 * const alerts = alertsAdmin<"skriuw">(send);
 * await alerts.sync("skriuw", [mail({ to: ["remco@gmail.com"] })]);
 */
export function alertsAdmin<Projects extends string>(send: AdminSend): AlertsAdmin<Projects> {
  function targetsPath(project: Projects) {
    return `/v2/projects/${encodeURIComponent(project)}/alerts/targets`;
  }

  function targetPath(project: Projects, name: string) {
    return `${targetsPath(project)}/${encodeURIComponent(name)}`;
  }

  async function data<Value>(answer: AdminResult<{ data: Value }>): AdminResult<Value> {
    const result = await answer;
    return result.ok ? { ok: true, value: result.value.data } : result;
  }

  return {
    sync: (project, targets) =>
      data(
        send<TargetChangesResponse>({
          method: "PUT",
          path: targetsPath(project),
          body: { targets: targets.map((target) => targetBody(target)) },
        }),
      ),
    list: (project) => data(send<AlertTargetList>({ method: "GET", path: targetsPath(project) })),
    set: (project, target) =>
      data(
        send<TargetChangesResponse>({
          method: "PUT",
          path: targetPath(project, target.name ?? target.channel),
          body: targetBody(target),
        }),
      ),
    remove: async (project, name) => {
      const result = await send<Json>({ method: "DELETE", path: targetPath(project, name) });
      return result.ok ? { ok: true, value: null } : result;
    },
    test: (project, name) =>
      data(send<TargetTest>({ method: "POST", path: `${targetPath(project, name)}/test` })),
    rotate: (project, name) =>
      data(send<RotatedSecret>({ method: "POST", path: `${targetPath(project, name)}/rotate` })),
    deliveries: (project, query = {}) =>
      send<AlertDeliveryList>({
        method: "GET",
        path: `/v2/projects/${encodeURIComponent(project)}/alerts/deliveries`,
        query,
      }),
    status: () => data(send<AlertsStatus>({ method: "GET", path: "/v2/admin/alerts/status" })),
  };
}
