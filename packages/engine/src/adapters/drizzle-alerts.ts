import { AlertEvent } from "@spoar/contract";
import type { AlertEventName, ChannelName, DeliveryStatus } from "@spoar/contract";
import type { Nullable, ProjectID } from "@spoar/shared/semantic";
import { Value } from "@sinclair/typebox/value";
import { sql } from "drizzle-orm";

import { alertEventNames } from "../alerts/events";
import { webhookSecret } from "../alerts/sign-body";
import type {
  AlertStore,
  DeliveryBatch,
  DeliveryRecord,
  TargetChanges,
  TargetRecord,
  TargetSpec,
} from "../ports/alerts";
import type { Database } from "./drizzle";
import { attempt, numeric, selectRows, textual } from "./drizzle-rows";
import type { Row } from "./drizzle-rows";

const channelNames = new Set<string>(["mail", "webhook", "discord"]);
const eventNames = new Set<string>(alertEventNames);
const statuses = new Set<string>(["pending", "sent", "failed"]);

const latestAttempt = sql`LEFT JOIN LATERAL (
    SELECT d.status, d.last_error FROM alert_deliveries d
    WHERE d.target_id = t.id AND d.attempts > 0 ORDER BY d.id DESC LIMIT 1
  ) f ON true`;

function isChannel(value: string): value is ChannelName {
  return channelNames.has(value);
}

function isEvent(value: string): value is AlertEventName {
  return eventNames.has(value);
}

function isStatus(value: string): value is DeliveryStatus {
  return statuses.has(value);
}

function optionalText(value: unknown) {
  return value === null || value === undefined ? null : textual(value);
}

function optionalDate(value: unknown) {
  return value === null || value === undefined ? null : new Date(textual(value));
}

function texts(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => textual(item)) : [];
}

function settingsOf(value: unknown) {
  return typeof value === "string" ? JSON.parse(value) : value;
}

function field(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null && key in value
    ? Object.getOwnPropertyDescriptor(value, key)?.value
    : undefined;
}

function toSpec(row: Row): Nullable<TargetSpec> {
  const channel = textual(row.channel);
  if (!isChannel(channel)) return null;
  const base = {
    name: textual(row.name),
    on: texts(row.events).filter(isEvent),
    enabled: row.enabled === true,
  };
  const settings = settingsOf(row.settings);
  if (channel === "mail")
    return { ...base, channel, settings: { to: texts(field(settings, "to")) } };
  return { ...base, channel, settings: { url: textual(field(settings, "url") ?? "") } };
}

function toTarget(row: Row): Nullable<TargetRecord> {
  const spec = toSpec(row);
  if (!spec) return null;
  const failing =
    row.failure_status !== null &&
    row.failure_status !== undefined &&
    row.failure_status !== "sent";
  return {
    ...spec,
    id: textual(row.id),
    projectId: textual(row.project_id),
    secret: optionalText(row.webhook_secret),
    failure: failing ? (optionalText(row.failure_error) ?? "The last delivery failed") : null,
    createdAt: new Date(textual(row.created_at)),
    updatedAt: new Date(textual(row.updated_at)),
  };
}

function toDelivery(row: Row): Nullable<DeliveryRecord> {
  const payload = settingsOf(row.payload);
  const channel = textual(row.channel);
  const status = textual(row.status);
  if (!Value.Check(AlertEvent, payload) || !isChannel(channel) || !isStatus(status)) return null;
  return {
    id: textual(row.delivery_id),
    targetId: textual(row.target_id),
    target: textual(row.name),
    channel,
    event: payload,
    subject: textual(row.subject_id),
    status,
    attempts: numeric(row.attempts),
    nextAttemptAt: status === "pending" ? optionalDate(row.next_attempt_at) : null,
    lastError: optionalText(row.last_error),
    sentAt: optionalDate(row.sent_at),
    createdAt: new Date(textual(row.delivery_created_at)),
  };
}

function sameSpec(a: TargetSpec, b: TargetSpec) {
  return (
    a.channel === b.channel &&
    a.enabled === b.enabled &&
    JSON.stringify([...a.on].sort()) === JSON.stringify([...b.on].sort()) &&
    JSON.stringify(a.settings) === JSON.stringify(b.settings)
  );
}

function targetId() {
  return `alt_${crypto.randomUUID().replaceAll("-", "")}`;
}

function eventArray(events: AlertEventName[]) {
  return sql`ARRAY[${sql.join(
    events.map((event) => sql`${event}`),
    sql`, `,
  )}]::text[]`;
}

const deliveryColumns = sql`d.id AS delivery_id, d.event_name, d.subject_id, d.payload, d.status,
  d.attempts, d.next_attempt_at, d.last_error, d.sent_at, d.created_at AS delivery_created_at,
  t.id, t.id AS target_id, t.project_id, t.name, t.channel, t.events, t.settings, t.webhook_secret,
  t.enabled, t.created_at, t.updated_at`;

/**
 * @name drizzleAlerts
 * @description The `AlertStore` on `alert_targets` and `alert_deliveries`: targets per project
 * with the reason they are failing, `sync` and single-target changes that generate a webhook
 * secret for each new webhook target, the delivery queue with `ON CONFLICT DO NOTHING` on
 * `(target_id, event_name, subject_id)`, due batches per target, and the delivery history.
 *
 * @example
 * await drizzleAlerts(db).targets("remcostoeten.nl");
 */
export function drizzleAlerts(db: Database, newSecret: () => string = webhookSecret): AlertStore {
  async function rows(project: ProjectID) {
    return selectRows(
      db,
      sql`SELECT t.*, f.status AS failure_status, f.last_error AS failure_error
        FROM alert_targets t ${latestAttempt}
        WHERE t.project_id = ${project} ORDER BY t.name`,
    );
  }

  async function write(project: ProjectID, specs: TargetSpec[], replace: boolean) {
    const existing = new Map(
      (await rows(project)).flatMap((row) => {
        const target = toTarget(row);
        return target ? [[target.name, target] as const] : [];
      }),
    );
    const changes: TargetChanges = { created: [], updated: [], removed: [], secrets: {} };
    for (const spec of specs) {
      const current = existing.get(spec.name);
      const secret =
        spec.channel === "webhook"
          ? current?.channel === "webhook"
            ? current.secret
            : null
          : null;
      const fresh = spec.channel === "webhook" && !secret ? newSecret() : null;
      if (fresh) changes.secrets[spec.name] = fresh;
      if (current && sameSpec(current, spec) && !fresh) continue;
      const kept = spec.channel === "webhook" ? (fresh ?? secret) : null;
      if (current) {
        await db.execute(
          sql`UPDATE alert_targets SET channel = ${spec.channel}, events = ${eventArray(spec.on)},
              settings = ${JSON.stringify(spec.settings)}::jsonb, webhook_secret = ${kept},
              enabled = ${spec.enabled}, updated_at = now()
            WHERE id = ${current.id}`,
        );
        changes.updated.push(spec.name);
      } else {
        await db.execute(
          sql`INSERT INTO alert_targets (id, project_id, name, channel, events, settings, webhook_secret, enabled)
            VALUES (${targetId()}, ${project}, ${spec.name}, ${spec.channel}, ${eventArray(spec.on)},
              ${JSON.stringify(spec.settings)}::jsonb, ${kept}, ${spec.enabled})`,
        );
        changes.created.push(spec.name);
      }
    }
    if (!replace) return changes;
    const wanted = new Set(specs.map((spec) => spec.name));
    const removed = [...existing.values()].filter((target) => !wanted.has(target.name));
    for (const target of removed) {
      await db.execute(sql`DELETE FROM alert_targets WHERE id = ${target.id}`);
      changes.removed.push(target.name);
    }
    return changes;
  }

  return {
    targets: (project) =>
      attempt("Could not read the alert targets", async () =>
        (await rows(project)).map(toTarget).filter((target) => target !== null),
      ),
    target: (project, name) =>
      attempt("Could not read the alert target", async () => {
        const found = (await rows(project)).map(toTarget).find((target) => target?.name === name);
        return found ?? null;
      }),
    syncTargets: (project, targets) =>
      attempt("Could not save the alert targets", () => write(project, targets, true)),
    saveTarget: (project, target) =>
      attempt("Could not save the alert target", () => write(project, [target], false)),
    removeTarget: (project, name) =>
      attempt("Could not remove the alert target", async () => {
        const removed = await selectRows(
          db,
          sql`DELETE FROM alert_targets WHERE project_id = ${project} AND name = ${name} RETURNING id`,
        );
        return removed.length > 0;
      }),
    rotateSecret: (project, name) =>
      attempt("Could not rotate the webhook secret", async () => {
        const secret = newSecret();
        const updated = await selectRows(
          db,
          sql`UPDATE alert_targets SET webhook_secret = ${secret}, updated_at = now()
            WHERE project_id = ${project} AND name = ${name} AND channel = 'webhook' RETURNING id`,
        );
        return updated.length > 0 ? secret : null;
      }),
    subscribed: (event, channels) =>
      attempt("Could not read the subscribed projects", async () => {
        if (channels.length === 0) return [];
        const rows = await selectRows(
          db,
          sql`SELECT DISTINCT project_id FROM alert_targets
            WHERE enabled AND ${event} = ANY(events) AND channel IN (${sql.join(
              channels.map((channel) => sql`${channel}`),
              sql`, `,
            )})
            ORDER BY project_id`,
        );
        return rows.map((row) => textual(row.project_id));
      }),
    queue: (events, channels, now) =>
      attempt("Could not queue the alerts", async () => {
        if (events.length === 0 || channels.length === 0) return { queued: 0 };
        const values = sql.join(
          events.map(
            ({ event, subject }) =>
              sql`(${event.name}::text, ${event.project}::text, ${subject}::text, ${JSON.stringify(event)}::text)`,
          ),
          sql`, `,
        );
        const queued = await selectRows(
          db,
          sql`INSERT INTO alert_deliveries (target_id, event_name, subject_id, payload, next_attempt_at, created_at)
            SELECT t.id, e.name, e.subject, e.payload::jsonb, ${now.toISOString()}::timestamptz,
              ${now.toISOString()}::timestamptz
            FROM (VALUES ${values}) AS e(name, project, subject, payload)
            JOIN alert_targets t ON t.project_id = e.project AND t.enabled AND e.name = ANY(t.events)
              AND t.channel IN (${sql.join(
                channels.map((channel) => sql`${channel}`),
                sql`, `,
              )})
            ON CONFLICT (target_id, event_name, subject_id) DO NOTHING
            RETURNING id`,
        );
        return { queued: queued.length };
      }),
    due: (now, limit) =>
      attempt("Could not read the due alerts", async () => {
        const found = await selectRows(
          db,
          sql`SELECT ${deliveryColumns} FROM alert_deliveries d JOIN alert_targets t ON t.id = d.target_id
            WHERE d.status = 'pending' AND t.enabled AND d.next_attempt_at <= ${now.toISOString()}::timestamptz
            ORDER BY d.id LIMIT ${limit}`,
        );
        const batches = new Map<string, DeliveryBatch>();
        for (const row of found) {
          const target = toTarget(row);
          const delivery = toDelivery(row);
          if (!target || !delivery) continue;
          const batch = batches.get(target.id) ?? { target, deliveries: [] };
          batch.deliveries.push(delivery);
          batches.set(target.id, batch);
        }
        return [...batches.values()];
      }),
    settle: (outcomes) =>
      attempt("Could not settle the alerts", async () => {
        if (outcomes.length === 0) return null;
        const values = sql.join(
          outcomes.map(
            (outcome) =>
              sql`(${outcome.id}::bigint, ${outcome.status}::text, ${outcome.attempts}::integer,
                ${outcome.nextAttemptAt?.toISOString() ?? null}::timestamptz, ${outcome.error}::text,
                ${outcome.at.toISOString()}::timestamptz)`,
          ),
          sql`, `,
        );
        await db.execute(
          sql`UPDATE alert_deliveries d SET status = v.status, attempts = v.attempts,
              next_attempt_at = COALESCE(v.next_at, d.next_attempt_at), last_error = v.error,
              sent_at = CASE WHEN v.status = 'sent' THEN v.at ELSE d.sent_at END
            FROM (VALUES ${values}) AS v(id, status, attempts, next_at, error, at)
            WHERE d.id = v.id`,
        );
        return null;
      }),
    deliveries: (project, status, page) =>
      attempt("Could not read the alert deliveries", async () => {
        const filter = status ? sql`AND d.status = ${status}` : sql``;
        const found = await selectRows(
          db,
          sql`SELECT ${deliveryColumns} FROM alert_deliveries d JOIN alert_targets t ON t.id = d.target_id
            WHERE t.project_id = ${project} ${filter}
            ORDER BY d.id DESC LIMIT ${page.limit} OFFSET ${page.offset}`,
        );
        const [count] = await selectRows(
          db,
          sql`SELECT count(*) AS total FROM alert_deliveries d JOIN alert_targets t ON t.id = d.target_id
            WHERE t.project_id = ${project} ${filter}`,
        );
        return {
          rows: found.map(toDelivery).filter((delivery) => delivery !== null),
          total: numeric(count?.total),
        };
      }),
    pending: () =>
      attempt("Could not count the pending alerts", async () => {
        const [row] = await selectRows(
          db,
          sql`SELECT count(*) AS pending FROM alert_deliveries WHERE status = 'pending'`,
        );
        return numeric(row?.pending);
      }),
    failing: () =>
      attempt("Could not read the failing alert targets", async () => {
        const found = await selectRows(
          db,
          sql`SELECT t.*, f.status AS failure_status, f.last_error AS failure_error
            FROM alert_targets t ${latestAttempt}
            WHERE f.status IS NOT NULL AND f.status <> 'sent' ORDER BY t.project_id, t.name`,
        );
        return found
          .map(toTarget)
          .filter((target) => target !== null)
          .map((target) => ({
            projectId: target.projectId,
            name: target.name,
            channel: target.channel,
            reason: target.failure,
          }));
      }),
  };
}
