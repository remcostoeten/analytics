import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { IssueLevel, VitalMetric, VitalRating } from "./enums";
import { Count, dataOf, listOf, nullable, oneOf, Timestamp } from "./schema";

export const IssueAlertName = oneOf(["issue.new", "issue.regression"]);
export type IssueAlertName = Static<typeof IssueAlertName>;

export const AlertEventName = oneOf(["issue.new", "issue.regression", "speed.drop"]);
export type AlertEventName = Static<typeof AlertEventName>;

export const ChannelName = oneOf(["mail", "webhook", "discord"]);
export type ChannelName = Static<typeof ChannelName>;

export const TargetName = Type.String({
  minLength: 1,
  maxLength: 40,
  pattern: "^[a-z0-9][a-z0-9-]*$",
});
export type TargetName = Static<typeof TargetName>;

export const EmailAddress = Type.String({ format: "email", maxLength: 254 });
export type EmailAddress = Static<typeof EmailAddress>;

export const HttpsUrl = Type.String({ format: "uri", pattern: "^https://", maxLength: 2048 });
export type HttpsUrl = Static<typeof HttpsUrl>;

export const TargetState = oneOf(["active", "paused", "failing"]);
export type TargetState = Static<typeof TargetState>;

export const DeliveryStatus = oneOf(["pending", "sent", "failed"]);
export type DeliveryStatus = Static<typeof DeliveryStatus>;

const Subscription = Type.Array(AlertEventName, { minItems: 1, uniqueItems: true });
const Recipients = Type.Array(EmailAddress, { minItems: 1, maxItems: 20, uniqueItems: true });

const TargetOptions = {
  name: Type.Optional(TargetName),
  on: Type.Optional(Subscription),
  enabled: Type.Optional(Type.Boolean()),
};

export const MailTargetInput = Type.Object({
  channel: Type.Literal("mail"),
  ...TargetOptions,
  to: Recipients,
});
export type MailTargetInput = Static<typeof MailTargetInput>;

export const WebhookTargetInput = Type.Object({
  channel: Type.Literal("webhook"),
  ...TargetOptions,
  url: HttpsUrl,
});
export type WebhookTargetInput = Static<typeof WebhookTargetInput>;

export const DiscordTargetInput = Type.Object({
  channel: Type.Literal("discord"),
  ...TargetOptions,
  url: HttpsUrl,
});
export type DiscordTargetInput = Static<typeof DiscordTargetInput>;

export const TargetInput = Type.Union([MailTargetInput, WebhookTargetInput, DiscordTargetInput]);
export type TargetInput = Static<typeof TargetInput>;

export const SyncTargets = Type.Object({ targets: Type.Array(TargetInput, { maxItems: 50 }) });
export type SyncTargets = Static<typeof SyncTargets>;

const TargetFields = {
  id: Type.String({ minLength: 1 }),
  project: Type.String({ minLength: 1 }),
  name: TargetName,
  on: Subscription,
  enabled: Type.Boolean(),
  state: TargetState,
  stateReason: nullable(Type.String()),
  createdAt: Timestamp,
  updatedAt: Timestamp,
};

export const AlertTarget = Type.Union([
  Type.Object({ channel: Type.Literal("mail"), ...TargetFields, to: Recipients }),
  Type.Object({ channel: Type.Literal("webhook"), ...TargetFields, url: HttpsUrl }),
  Type.Object({ channel: Type.Literal("discord"), ...TargetFields, url: HttpsUrl }),
]);
export type AlertTarget = Static<typeof AlertTarget>;

export const AlertTargetList = listOf(AlertTarget);
export type AlertTargetList = Static<typeof AlertTargetList>;

export const TargetChanges = Type.Object({
  created: Type.Array(TargetName),
  updated: Type.Array(TargetName),
  removed: Type.Array(TargetName),
  secrets: Type.Record(Type.String(), Type.String({ minLength: 1 })),
});
export type TargetChanges = Static<typeof TargetChanges>;

export const TargetChangesResponse = dataOf(TargetChanges);
export type TargetChangesResponse = Static<typeof TargetChangesResponse>;

export const RotatedSecret = dataOf(
  Type.Object({ name: TargetName, secret: Type.String({ minLength: 1 }) }),
);
export type RotatedSecret = Static<typeof RotatedSecret>;

export const TargetTest = dataOf(
  Type.Object({
    name: TargetName,
    channel: ChannelName,
    delivered: Type.Boolean(),
    message: Type.String(),
  }),
);
export type TargetTest = Static<typeof TargetTest>;

export const IssueAlert = Type.Object({
  name: IssueAlertName,
  project: Type.String(),
  issue: Type.Object({
    id: Type.String(),
    title: Type.String(),
    culprit: nullable(Type.String()),
    level: IssueLevel,
    count: Count,
    firstSeen: Timestamp,
    lastSeen: Timestamp,
    lastRelease: nullable(Type.String()),
    url: Type.String({ format: "uri" }),
  }),
});
export type IssueAlert = Static<typeof IssueAlert>;

const Score = Type.Integer({ minimum: 0, maximum: 100 });

export const SpeedAlert = Type.Object({
  name: Type.Literal("speed.drop"),
  project: Type.String(),
  speed: Type.Object({
    score: Score,
    previous: Score,
    rating: VitalRating,
    worst: nullable(VitalMetric),
    samples: Count,
    from: Timestamp,
    to: Timestamp,
    url: Type.String({ format: "uri" }),
  }),
});
export type SpeedAlert = Static<typeof SpeedAlert>;

export const AlertEvent = Type.Union([IssueAlert, SpeedAlert]);
export type AlertEvent = Static<typeof AlertEvent>;

export const WebhookBody = Type.Object({
  v: Type.Literal(1),
  sentAt: Timestamp,
  events: Type.Array(AlertEvent),
});
export type WebhookBody = Static<typeof WebhookBody>;

export const AlertDelivery = Type.Object({
  id: Type.String({ minLength: 1 }),
  target: TargetName,
  channel: ChannelName,
  event: AlertEventName,
  subject: Type.String(),
  status: DeliveryStatus,
  attempts: Count,
  nextAttemptAt: nullable(Timestamp),
  lastError: nullable(Type.String()),
  sentAt: nullable(Timestamp),
  createdAt: Timestamp,
  payload: AlertEvent,
});
export type AlertDelivery = Static<typeof AlertDelivery>;

export const DeliveriesQuery = Type.Object({
  status: Type.Optional(DeliveryStatus),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
  cursor: Type.Optional(Type.String({ minLength: 1 })),
});
export type DeliveriesQuery = Static<typeof DeliveriesQuery>;

export const AlertDeliveryList = listOf(AlertDelivery);
export type AlertDeliveryList = Static<typeof AlertDeliveryList>;

export const AlertsStatus = dataOf(
  Type.Object({
    channels: Type.Array(
      Type.Object({ name: ChannelName, ready: Type.Boolean(), problem: nullable(Type.String()) }),
    ),
    transport: nullable(
      Type.Object({
        name: oneOf(["smtp", "resend"]),
        host: nullable(Type.String()),
        from: Type.String(),
      }),
    ),
    pending: Count,
    failing: Type.Array(
      Type.Object({
        project: Type.String(),
        name: TargetName,
        channel: ChannelName,
        reason: nullable(Type.String()),
      }),
    ),
  }),
);
export type AlertsStatus = Static<typeof AlertsStatus>;
