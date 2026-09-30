import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { Props } from "./common";
import { EventName } from "./enums";
import { ErrorCode } from "./errors";
import { groupTypePattern, maxEventsPerBatch, maxGroupId, maxGroups } from "./limits";
import { Count, nullable, Timestamp } from "./schema";

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

export const GroupType = Type.String({ pattern: groupTypePattern });
export const GroupId = Type.String({ minLength: 1, maxLength: maxGroupId });

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
  props: Props,
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
