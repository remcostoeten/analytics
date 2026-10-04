import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { BotReason, Channel, DeviceType, Environment, Period, TrafficFilter } from "./enums";
import { nullable, oneOf } from "./schema";

export const PropValue = Type.Union([Type.String(), Type.Number(), Type.Boolean(), Type.Null()], {
  description: "A custom property value: a string, number, boolean or null.",
});
export type PropValue = Static<typeof PropValue>;

export const Props = Type.Record(Type.String(), PropValue, {
  description: "Custom properties sent with the event, keyed by name.",
});
export type Props = Static<typeof Props>;

export const ProjectParams = Type.Object({
  project: Type.String({
    minLength: 1,
    description: "The project id, as listed by `GET /v2/projects`.",
  }),
});
export type ProjectParams = Static<typeof ProjectParams>;

export const Range = Type.Object(
  {
    from: Type.String({ format: "date-time", description: "Start of the range, inclusive." }),
    to: Type.String({ format: "date-time", description: "End of the range, exclusive." }),
  },
  { description: "The time range the numbers cover, in UTC." },
);
export type Range = Static<typeof Range>;

export const Compared = Type.Object(
  {
    value: Type.Number({ description: "The value for the requested range." }),
    previous: Type.Number({
      description: "The value for the range of the same length just before it.",
    }),
    change: nullable(
      Type.Number({
        description:
          "`(value - previous) / previous`, rounded to three decimals: `0.191` is up 19.1%. Null when `previous` is 0.",
      }),
    ),
  },
  { description: "A number for the range next to the same number for the period before it." },
);
export type Compared = Static<typeof Compared>;

export const Filters = Type.Record(Type.String(), Type.String(), {
  description:
    "The `filter[<dimension>]` values the read applied, keyed by dimension; a leading `!` excludes.",
});
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
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, description: "Rows per page." })),
  cursor: Type.Optional(
    Type.String({
      minLength: 1,
      description: "The `nextCursor` from the previous page; leave it out for the first page.",
    }),
  ),
});
export type PageQuery = Static<typeof PageQuery>;

export const ReadQuery = Type.Intersect([RangeQuery, FilterQuery, PageQuery]);
export type ReadQuery = Static<typeof ReadQuery>;

export const Geo = Type.Object(
  {
    country: nullable(
      Type.String({ minLength: 2, maxLength: 2, description: "ISO 3166-1 alpha-2 country code." }),
    ),
    region: nullable(Type.String({ description: "Region or state name." })),
    city: nullable(Type.String()),
    postalCode: nullable(Type.String()),
    timezone: nullable(Type.String({ description: "IANA time zone, such as `Europe/Amsterdam`." })),
    latitude: nullable(Type.Number({ minimum: -90, maximum: 90 })),
    longitude: nullable(Type.Number({ minimum: -180, maximum: 180 })),
  },
  {
    description:
      "Location looked up from the IP address at ingest. The address itself is never stored; null when the lookup has no answer.",
  },
);
export type Geo = Static<typeof Geo>;

export const Device = Type.Object(
  {
    type: DeviceType,
    browser: nullable(Type.String()),
    browserVersion: nullable(Type.String()),
    os: nullable(Type.String()),
    osVersion: nullable(Type.String()),
    screen: nullable(Type.String({ description: "Screen size in CSS pixels, as `WIDTHxHEIGHT`." })),
    viewport: nullable(
      Type.String({ description: "Window size in CSS pixels, as `WIDTHxHEIGHT`." }),
    ),
    language: nullable(Type.String({ description: "Browser language tag, such as `nl-NL`." })),
    connection: nullable(
      Type.String({ description: "Effective connection type from the browser, such as `4g`." }),
    ),
  },
  { description: "Browser, OS and screen, from the user agent and the SDK." },
);
export type Device = Static<typeof Device>;

export const Utm = Type.Object(
  {
    source: nullable(Type.String()),
    medium: nullable(Type.String()),
    campaign: nullable(Type.String()),
    term: nullable(Type.String()),
    content: nullable(Type.String()),
  },
  { description: "The `utm_*` tags on the landing URL." },
);
export type Utm = Static<typeof Utm>;

export const Source = Type.Object(
  {
    referrer: nullable(Type.String({ description: "The referring URL." })),
    referrerDomain: nullable(Type.String({ description: "Host of the referrer, without `www.`." })),
    channel: Channel,
    utm: Utm,
  },
  { description: "Where the visit came from." },
);
export type Source = Static<typeof Source>;

export const BotScore = Type.Integer({
  minimum: 0,
  maximum: 100,
  description: "Bot likelihood from 0 to 100. 50 and up counts as a bot, 25 and up as suspect.",
});

export const BotVerdict = Type.Object({
  score: BotScore,
  reasons: Type.Array(BotReason, { description: "The checks that added to the score." }),
});
export type BotVerdict = Static<typeof BotVerdict>;

export const BotLabel = oneOf(["human", "suspect", "bot"], {
  description: "`bot` from a score of 50, `suspect` from 25, `human` below that.",
});
export type BotLabel = Static<typeof BotLabel>;

const SignalFlag = nullable(
  Type.Boolean({ description: "Whether the signal fired; null when it was not measured." }),
);

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
  score: BotScore,
  verdict: BotLabel,
  signals: BotSignals,
});
export type BotDetail = Static<typeof BotDetail>;

export const ValueCount = Type.Object({
  value: Type.String({ description: "The dimension value, such as a path or country code." }),
  visitors: Type.Integer({ minimum: 0, description: "Unique visitors with that value." }),
});
export type ValueCount = Static<typeof ValueCount>;
