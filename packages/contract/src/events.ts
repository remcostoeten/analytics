import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { EventName } from "./enums";
import { ErrorCode } from "./errors";
import { Count, nullable, Timestamp } from "./schema";

export const maxEventsPerBatch = 50;
export const maxBodyBytes = 60 * 1024;
export const maxProps = 25;
export const maxPropKeyLength = 255;
export const maxPropValueLength = 255;
export const maxLongPropValueLength = 2048;
export const longPropKeys = ["stack", "breadcrumbs"] as const;

const Text = Type.String({ maxLength: 2048 });
const Identifier = Type.String({ minLength: 1, maxLength: 64 });

export const WirePage = Type.Object({
  path: Type.String({ minLength: 1, maxLength: 2048 }),
  route: Type.Optional(Text),
  title: Type.Optional(Text),
  referrer: Type.Optional(nullable(Text)),
});
export type WirePage = Static<typeof WirePage>;

export const WireUtm = Type.Object({
  source: Type.Optional(Text),
  medium: Type.Optional(Text),
  campaign: Type.Optional(Text),
  term: Type.Optional(Text),
  content: Type.Optional(Text),
});
export type WireUtm = Static<typeof WireUtm>;

export const WireContext = Type.Object({
  screen: Type.Optional(Text),
  viewport: Type.Optional(Text),
  tz: Type.Optional(Text),
  lang: Type.Optional(Text),
  connection: Type.Optional(Text),
  utm: Type.Optional(WireUtm),
  release: Type.Optional(Text),
  ua: Type.Optional(Text),
  ip: Type.Optional(Text),
});
export type WireContext = Static<typeof WireContext>;

export const WireProps = Type.Record(
  Type.String({ pattern: `^[\\s\\S]{0,${maxPropKeyLength}}$` }),
  Type.Union([
    Type.String({ maxLength: maxLongPropValueLength }),
    Type.Number(),
    Type.Boolean(),
    Type.Null(),
  ]),
  {
    maxProperties: maxProps,
    additionalProperties: false,
    description: `At most ${maxProps} flat props with keys up to ${maxPropKeyLength} characters. String values are up to ${maxPropValueLength} characters, except \`stack\` and \`breadcrumbs\` on \`error\` events, which are up to ${maxLongPropValueLength}.`,
  },
);
export type WireProps = Static<typeof WireProps>;

/**
 * @name propValueLimit
 * @description The longest string value a prop may hold: 2048 characters for `stack` and
 * `breadcrumbs` on `error` events, 255 for everything else. The SDK cuts values to it and ingest
 * rejects an event over it.
 *
 * @example
 * propValueLimit("error", "stack"); // 2048
 * propValueLimit("pageview", "stack"); // 255
 */
export function propValueLimit(name: string, key: string) {
  const long = longPropKeys.some((candidate) => candidate === key);
  return name === "error" && long ? maxLongPropValueLength : maxPropValueLength;
}

export const maxGroups = 5;

export const GroupType = Type.String({ pattern: "^[a-z][a-z0-9_]{0,31}$" });
export const GroupId = Type.String({ minLength: 1, maxLength: 128 });

export const WireGroups = Type.Record(GroupType, GroupId, {
  maxProperties: maxGroups,
  additionalProperties: false,
});
export type WireGroups = Static<typeof WireGroups>;

export const WireEvent = Type.Object({
  id: Type.String({ format: "uuid" }),
  name: EventName,
  ts: Timestamp,
  visitor: Identifier,
  session: Identifier,
  page: WirePage,
  props: WireProps,
  context: Type.Optional(WireContext),
  groups: Type.Optional(WireGroups),
  signals: Type.Optional(Type.Integer({ minimum: 0 })),
});
export type WireEvent = Static<typeof WireEvent>;

export const IngestEnvelope = Type.Object({
  v: Type.Literal(1),
  sentAt: Timestamp,
  events: Type.Array(WireEvent, { minItems: 1, maxItems: maxEventsPerBatch }),
});
export type IngestEnvelope = Static<typeof IngestEnvelope>;

export const RejectedEvent = Type.Object({
  index: Count,
  code: ErrorCode,
  message: Type.String({ minLength: 1 }),
});
export type RejectedEvent = Static<typeof RejectedEvent>;

export const IngestResult = Type.Object({
  accepted: Count,
  duplicates: Count,
  rejected: Type.Array(RejectedEvent),
});
export type IngestResult = Static<typeof IngestResult>;
