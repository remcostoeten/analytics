import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { BotReason, Channel, DeviceType, Environment, Period, TrafficFilter } from "./enums";
import { Count, nullable, oneOf, Timestamp } from "./schema";

export const PropValue = Type.Union([Type.String(), Type.Number(), Type.Boolean(), Type.Null()]);
export type PropValue = Static<typeof PropValue>;

export const Props = Type.Record(Type.String(), PropValue);
export type Props = Static<typeof Props>;

export const Range = Type.Object({ from: Timestamp, to: Timestamp });
export type Range = Static<typeof Range>;

export const Compared = Type.Object({
  value: Type.Number(),
  previous: Type.Number(),
  change: nullable(Type.Number()),
});
export type Compared = Static<typeof Compared>;

export const Filters = Type.Record(Type.String(), Type.String());
export type Filters = Static<typeof Filters>;

export const RangeQuery = Type.Object({
  from: Type.Optional(
    Type.String({ format: "date-time", description: "Start of the range; send with `to`." }),
  ),
  to: Type.Optional(
    Type.String({ format: "date-time", description: "End of the range, exclusive." }),
  ),
  period: Type.Optional(Period),
});
export type RangeQuery = Static<typeof RangeQuery>;

export const FilterQuery = Type.Object({
  traffic: Type.Optional(TrafficFilter),
  environment: Type.Optional(Environment),
  filter: Type.Optional(
    Type.Record(Type.String(), Type.String(), {
      description:
        "Sent as `filter[<dimension>]=value`, or `!value` to exclude; repeatable across dimensions.",
    }),
  ),
});
export type FilterQuery = Static<typeof FilterQuery>;

export const PageQuery = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
  cursor: Type.Optional(Type.String({ minLength: 1 })),
});
export type PageQuery = Static<typeof PageQuery>;

export const ReadQuery = Type.Intersect([RangeQuery, FilterQuery, PageQuery]);
export type ReadQuery = Static<typeof ReadQuery>;

export const Geo = Type.Object({
  country: nullable(Type.String({ minLength: 2, maxLength: 2 })),
  region: nullable(Type.String()),
  city: nullable(Type.String()),
  postalCode: nullable(Type.String()),
  timezone: nullable(Type.String()),
  latitude: nullable(Type.Number({ minimum: -90, maximum: 90 })),
  longitude: nullable(Type.Number({ minimum: -180, maximum: 180 })),
});
export type Geo = Static<typeof Geo>;

export const Device = Type.Object({
  type: DeviceType,
  browser: nullable(Type.String()),
  browserVersion: nullable(Type.String()),
  os: nullable(Type.String()),
  osVersion: nullable(Type.String()),
  screen: nullable(Type.String()),
  viewport: nullable(Type.String()),
  language: nullable(Type.String()),
  connection: nullable(Type.String()),
});
export type Device = Static<typeof Device>;

export const Utm = Type.Object({
  source: nullable(Type.String()),
  medium: nullable(Type.String()),
  campaign: nullable(Type.String()),
  term: nullable(Type.String()),
  content: nullable(Type.String()),
});
export type Utm = Static<typeof Utm>;

export const Source = Type.Object({
  referrer: nullable(Type.String()),
  referrerDomain: nullable(Type.String()),
  channel: Channel,
  utm: Utm,
});
export type Source = Static<typeof Source>;

export const BotVerdict = Type.Object({
  score: Type.Integer({ minimum: 0, maximum: 100 }),
  reasons: Type.Array(BotReason),
});
export type BotVerdict = Static<typeof BotVerdict>;

export const BotLabel = oneOf(["human", "suspect", "bot"]);
export type BotLabel = Static<typeof BotLabel>;

const SignalFlag = nullable(Type.Boolean());

export const BotSignals = Type.Object({
  headless: SignalFlag,
  webdriver: SignalFlag,
  datacenterAsn: SignalFlag,
  pointerEvents: SignalFlag,
  uaMismatch: SignalFlag,
  uniformDwell: SignalFlag,
});
export type BotSignals = Static<typeof BotSignals>;

export const BotDetail = Type.Object({
  score: Type.Integer({ minimum: 0, maximum: 100 }),
  verdict: BotLabel,
  signals: BotSignals,
});
export type BotDetail = Static<typeof BotDetail>;

export const ValueCount = Type.Object({ value: Type.String(), visitors: Count });
export type ValueCount = Static<typeof ValueCount>;
