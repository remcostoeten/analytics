import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { IssueLevel, VitalMetric, VitalRating } from "./enums";
import { Count, dataOf, listOf, nullable, oneOf, Timestamp } from "./schema";

export const IssueAlertName = oneOf(["issue.new", "issue.regression"]);
export type IssueAlertName = Static<typeof IssueAlertName>;

export const AlertEventName = oneOf(["issue.new", "issue.regression", "speed.drop"], {
  description:
    "`issue.new` for a new issue, `issue.regression` when a resolved issue happens again, `speed.drop` when yesterday's Real Experience Score fell against the week before.",
});
export type AlertEventName = Static<typeof AlertEventName>;

export const ChannelName = oneOf(["mail", "webhook", "discord"], {
  description: "How alerts are sent. Only the channels enabled in the deployment config work.",
});
export type ChannelName = Static<typeof ChannelName>;

export const TargetName = Type.String({
  minLength: 1,
  maxLength: 40,
  pattern: "^[a-z0-9][a-z0-9-]*$",
  description:
    "The target's name within the project, used in its paths; defaults to the channel name.",
});
export type TargetName = Static<typeof TargetName>;

export const EmailAddress = Type.String({ format: "email", maxLength: 254 });
export type EmailAddress = Static<typeof EmailAddress>;

export const HttpsUrl = Type.String({ format: "uri", pattern: "^https://", maxLength: 2048 });
export type HttpsUrl = Static<typeof HttpsUrl>;

export const TargetState = oneOf(["active", "paused", "failing"], {
  description:
    "`paused` when the target is disabled or its channel is off or not ready, `failing` when its last delivery failed, otherwise `active`.",
});
export type TargetState = Static<typeof TargetState>;

export const DeliveryStatus = oneOf(["pending", "sent", "failed"], {
  description:
    "`pending` until sent, including between retries; `failed` once the retry policy runs out.",
});
export type DeliveryStatus = Static<typeof DeliveryStatus>;

const Subscription = Type.Array(AlertEventName, {
  minItems: 1,
  uniqueItems: true,
  description: "The alert events the target receives; both issue events by default.",
});
const Recipients = Type.Array(EmailAddress, {
  minItems: 1,
  maxItems: 20,
  uniqueItems: true,
  description: "Mail recipients.",
});
const WebhookUrl = Type.String({
  format: "uri",
  pattern: "^https://",
  maxLength: 2048,
  description: "The `https://` URL that receives a signed `WebhookBody` per batch.",
});
const DiscordUrl = Type.String({
  format: "uri",
  pattern: "^https://",
  maxLength: 2048,
  description: "The Discord channel's webhook URL.",
});

const TargetOptions = {
  name: Type.Optional(TargetName),
  on: Type.Optional(Subscription),
  enabled: Type.Optional(
    Type.Boolean({ description: "Set to false to pause it; true by default." }),
  ),
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
  url: WebhookUrl,
});
export type WebhookTargetInput = Static<typeof WebhookTargetInput>;

export const DiscordTargetInput = Type.Object({
  channel: Type.Literal("discord"),
  ...TargetOptions,
  url: DiscordUrl,
});
export type DiscordTargetInput = Static<typeof DiscordTargetInput>;

export const TargetInput = Type.Union([MailTargetInput, WebhookTargetInput, DiscordTargetInput]);
export type TargetInput = Static<typeof TargetInput>;

export const SyncTargets = Type.Object({
  targets: Type.Array(TargetInput, {
    maxItems: 50,
    description:
      "The full list: missing targets are added, changed ones updated, and unlisted ones removed.",
  }),
});
export type SyncTargets = Static<typeof SyncTargets>;

const TargetFields = {
  id: Type.String({ minLength: 1 }),
  project: Type.String({ minLength: 1, description: "The project id." }),
  name: TargetName,
  on: Subscription,
  enabled: Type.Boolean(),
  state: TargetState,
  stateReason: nullable(Type.String({ description: "Why the target is paused or failing." })),
  createdAt: Timestamp,
  updatedAt: Timestamp,
};

export const AlertTarget = Type.Union([
  Type.Object({ channel: Type.Literal("mail"), ...TargetFields, to: Recipients }),
  Type.Object({ channel: Type.Literal("webhook"), ...TargetFields, url: WebhookUrl }),
  Type.Object({ channel: Type.Literal("discord"), ...TargetFields, url: DiscordUrl }),
]);
export type AlertTarget = Static<typeof AlertTarget>;

export const AlertTargetList = listOf(AlertTarget);
export type AlertTargetList = Static<typeof AlertTargetList>;

export const TargetChanges = Type.Object({
  created: Type.Array(TargetName),
  updated: Type.Array(TargetName),
  removed: Type.Array(TargetName),
  secrets: Type.Record(Type.String(), Type.String({ minLength: 1 }), {
    description:
      "The `whsec_` signing secret of each new webhook target, by name. Shown only here.",
  }),
});
export type TargetChanges = Static<typeof TargetChanges>;

export const TargetChangesResponse = dataOf(TargetChanges);
export type TargetChangesResponse = Static<typeof TargetChangesResponse>;

export const RotatedSecret = dataOf(
  Type.Object({
    name: TargetName,
    secret: Type.String({
      minLength: 1,
      description: "The new `whsec_` signing secret, shown only here. The old one stops working.",
    }),
  }),
);
export type RotatedSecret = Static<typeof RotatedSecret>;

export const TargetTest = dataOf(
  Type.Object({
    name: TargetName,
    channel: ChannelName,
    delivered: Type.Boolean({ description: "Whether the provider accepted the sample alert." }),
    message: Type.String({ description: "What the provider answered, such as an SMTP error." }),
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
    url: Type.String({ format: "uri", description: "The issue's API route." }),
  }),
});
export type IssueAlert = Static<typeof IssueAlert>;

export const SpeedAlert = Type.Object({
  name: Type.Literal("speed.drop"),
  project: Type.String(),
  speed: Type.Object({
    score: Type.Integer({
      minimum: 0,
      maximum: 100,
      description: "Yesterday's Real Experience Score: production, all devices, p75, UTC day.",
    }),
    previous: Type.Integer({
      minimum: 0,
      maximum: 100,
      description: "The score over the baseline days before it, 7 by default.",
    }),
    rating: VitalRating,
    worst: nullable(
      Type.Union(VitalMetric.anyOf, {
        description: "The metric whose score fell the most; null when none fell.",
      }),
    ),
    samples: Type.Integer({
      minimum: 0,
      description: "Samples of the most measured metric yesterday.",
    }),
    from: Timestamp,
    to: Timestamp,
    url: Type.String({ format: "uri", description: "The project's speed route." }),
  }),
});
export type SpeedAlert = Static<typeof SpeedAlert>;

export const AlertEvent = Type.Union([IssueAlert, SpeedAlert]);
export type AlertEvent = Static<typeof AlertEvent>;

export const WebhookBody = Type.Object(
  {
    v: Type.Literal(1, { description: "The body format version." }),
    sentAt: Timestamp,
    events: Type.Array(AlertEvent, { description: "The batch's alert events, newest first." }),
  },
  { description: "What a webhook target receives, signed with its `whsec_` secret." },
);
export type WebhookBody = Static<typeof WebhookBody>;

export const AlertDelivery = Type.Object({
  id: Type.String({ minLength: 1 }),
  target: Type.String({
    minLength: 1,
    maxLength: 40,
    description: "The name of the target it was sent to.",
  }),
  channel: ChannelName,
  event: AlertEventName,
  subject: Type.String({
    description:
      "What the alert is about: the issue id, `<issue>@<regressedAt>` for a regression, or `<project>@<day>` for a speed drop.",
  }),
  status: DeliveryStatus,
  attempts: Type.Integer({ minimum: 0, description: "Tries so far." }),
  nextAttemptAt: nullable(
    Type.String({ format: "date-time", description: "When a pending delivery is tried next." }),
  ),
  lastError: nullable(Type.String({ description: "The error of the last failed try." })),
  sentAt: nullable(Timestamp),
  createdAt: Timestamp,
  payload: Type.Union([IssueAlert, SpeedAlert], { description: "The alert event as sent." }),
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
      Type.Object({
        name: ChannelName,
        ready: Type.Boolean(),
        problem: nullable(Type.String({ description: "Why the channel is not ready." })),
      }),
      { description: "The channels enabled in the deployment config." },
    ),
    transport: nullable(
      Type.Object(
        {
          name: oneOf(["smtp", "resend"]),
          host: nullable(Type.String()),
          from: Type.String(),
        },
        { description: "The mail transport without secrets; null without a mail channel." },
      ),
    ),
    pending: Type.Integer({ minimum: 0, description: "Deliveries waiting to be sent." }),
    failing: Type.Array(
      Type.Object({
        project: Type.String(),
        name: TargetName,
        channel: ChannelName,
        reason: nullable(Type.String()),
      }),
      { description: "Targets whose last delivery failed, across projects." },
    ),
  }),
);
export type AlertsStatus = Static<typeof AlertsStatus>;
