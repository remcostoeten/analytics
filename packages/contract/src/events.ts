import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { ErrorCode } from "./errors";
import { groupTypePattern, maxEventsPerBatch, maxGroupId, maxGroups } from "./limits";
import { nullable } from "./schema";
import browserBatch from "../fixtures/IngestEnvelope/valid/browser-batch.json";
import serverEvent from "../fixtures/IngestEnvelope/valid/server-event.json";
import ingestResult from "../fixtures/IngestResult/valid/partly-rejected.json";

export const maxProps = 25;
export const maxPropKeyLength = 255;
export const maxPropValueLength = 255;
export const maxLongPropValueLength = 2048;
export const longPropKeys = ["stack", "breadcrumbs"] as const;

const Text = Type.String({ maxLength: 2048 });

export const WirePage = Type.Object(
  {
    path: Type.String({
      minLength: 1,
      maxLength: 2048,
      description:
        "The page path without the query string, such as `/blog/hello`. Hash routes send the path after `#`.",
    }),
    route: Type.Optional(
      Type.String({
        maxLength: 2048,
        description:
          "The route template when the framework adapter knows it, such as `/blog/[slug]`.",
      }),
    ),
    title: Type.Optional(Type.String({ maxLength: 2048, description: "The document title." })),
    referrer: Type.Optional(
      nullable(
        Type.String({
          maxLength: 2048,
          description: "The referring URL. The browser SDK only sends it on the first pageview.",
        }),
      ),
    ),
  },
  { description: "The page the event happened on." },
);
export type WirePage = Static<typeof WirePage>;

export const WireUtm = Type.Object(
  {
    source: Type.Optional(Text),
    medium: Type.Optional(Text),
    campaign: Type.Optional(Text),
    term: Type.Optional(Text),
    content: Type.Optional(Text),
  },
  { description: "The `utm_*` query parameters on the page URL, without the `utm_` prefix." },
);
export type WireUtm = Static<typeof WireUtm>;

export const WireContext = Type.Object(
  {
    screen: Type.Optional(
      Type.String({
        maxLength: 2048,
        description: "Screen size in CSS pixels, as `WIDTHxHEIGHT`.",
      }),
    ),
    viewport: Type.Optional(
      Type.String({
        maxLength: 2048,
        description: "Window size in CSS pixels, as `WIDTHxHEIGHT`.",
      }),
    ),
    tz: Type.Optional(
      Type.String({ maxLength: 2048, description: "IANA time zone, such as `Europe/Amsterdam`." }),
    ),
    lang: Type.Optional(
      Type.String({ maxLength: 2048, description: "`navigator.language`, such as `nl-NL`." }),
    ),
    connection: Type.Optional(
      Type.String({
        maxLength: 2048,
        description: "The browser's effective connection type, such as `4g`.",
      }),
    ),
    utm: Type.Optional(WireUtm),
    release: Type.Optional(
      Type.String({
        maxLength: 2048,
        description: "Your app's release or version, used to group errors by release.",
      }),
    ),
    ua: Type.Optional(
      Type.String({
        maxLength: 2048,
        description:
          "The visitor's user agent, for server-side events. Only read on requests with the secret key; otherwise the request's own header is used.",
      }),
    ),
    ip: Type.Optional(
      Type.String({
        maxLength: 2048,
        description:
          "The visitor's IP address, for server-side events. Only read on requests with the secret key. It is hashed and looked up for location, never stored.",
      }),
    ),
  },
  { description: "Facts about the browser and visit. Every field is optional." },
);
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

export const GroupType = Type.String({ pattern: groupTypePattern });
export const GroupId = Type.String({ minLength: 1, maxLength: maxGroupId });

export const WireGroups = Type.Record(GroupType, GroupId, {
  maxProperties: maxGroups,
  additionalProperties: false,
  description: `The groups the visitor joined, such as \`{ "company": "acme" }\`: up to ${maxGroups}, keyed by a lowercase group type, with ids up to ${maxGroupId} characters. Reads filter and break down by \`group:<type>\`.`,
});
export type WireGroups = Static<typeof WireGroups>;

export const WireEvent = Type.Object(
  {
    id: Type.String({
      format: "uuid",
      description:
        "A UUID the sender generates. A repeated id is counted as a duplicate and not stored again, so retries are safe.",
    }),
    name: Type.String({
      minLength: 1,
      maxLength: 64,
      description:
        "The event name: a built-in such as `pageview`, `click` or `error`, or your own custom name.",
    }),
    ts: Type.String({
      format: "date-time",
      description:
        "When the event happened, by the sender's clock. Ingest shifts it by the gap between `sentAt` and the time the batch arrived, so a wrong clock does not misplace it.",
    }),
    visitor: Type.String({
      minLength: 1,
      maxLength: 64,
      description:
        "An anonymous visitor id the sender keeps. The browser SDK stores a random id in `localStorage`; no cookies are used.",
    }),
    session: Type.String({
      minLength: 1,
      maxLength: 64,
      description:
        "A session id. The browser SDK keeps it in `sessionStorage` and starts a new one after 30 minutes without events.",
    }),
    page: WirePage,
    props: WireProps,
    context: Type.Optional(WireContext),
    groups: Type.Optional(WireGroups),
    signals: Type.Optional(
      Type.Integer({
        minimum: 0,
        description:
          "Bot hints the browser SDK collected, as bit flags: `1` webdriver, `2` headless, `4` no input on a page that was never visible. Leave it out from servers.",
      }),
    ),
  },
  { description: "One event. Each event in a batch is validated on its own." },
);
export type WireEvent = Static<typeof WireEvent>;

export const IngestEnvelope = Type.Object(
  {
    v: Type.Literal(1, { description: "The envelope version; always `1`." }),
    sentAt: Type.String({
      format: "date-time",
      description: "When the sender sent the batch, by its own clock. Used to correct each `ts`.",
    }),
    events: Type.Array(WireEvent, {
      minItems: 1,
      maxItems: maxEventsPerBatch,
      description: `1 to ${maxEventsPerBatch} events.`,
    }),
  },
  { examples: [browserBatch, serverEvent] },
);
export type IngestEnvelope = Static<typeof IngestEnvelope>;

export const RejectedEvent = Type.Object(
  {
    index: Type.Integer({
      minimum: 0,
      description: "Position of the rejected event in the batch's `events`, from 0.",
    }),
    code: ErrorCode,
    message: Type.String({
      minLength: 1,
      description: "What was wrong, with the field path, such as `events[1].id: Expected string`.",
    }),
  },
  { description: "An event that was not stored. The rest of the batch is unaffected." },
);
export type RejectedEvent = Static<typeof RejectedEvent>;

export const IngestResult = Type.Object(
  {
    accepted: Type.Integer({ minimum: 0, description: "Events stored." }),
    duplicates: Type.Integer({
      minimum: 0,
      description: "Events skipped because their `id` was already stored or repeated in the batch.",
    }),
    rejected: Type.Array(RejectedEvent, {
      description: "Events that failed validation, by index.",
    }),
  },
  { examples: [ingestResult] },
);
export type IngestResult = Static<typeof IngestResult>;
