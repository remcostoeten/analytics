import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { BotDetail, BotVerdict, Device, Geo, Props, PropValue, Source } from "./common";
import { DeviceType, EventName } from "./enums";
import { WireGroups } from "./events";
import { Count, dataOf, Id, listOf, nullable, Timestamp } from "./schema";
import eventList from "../fixtures/EventList/valid/signup.json";
import peopleList from "../fixtures/PeopleList/valid/identified.json";
import personResponse from "../fixtures/PersonResponse/valid/user-123.json";
import sessionEvents from "../fixtures/SessionEvents/valid/hn-visit.json";
import sessionList from "../fixtures/SessionList/valid/one.json";
import updatedVisitor from "../fixtures/UpdatedVisitor/valid/internal.json";
import updateVisitor from "../fixtures/UpdateVisitor/valid/internal.json";
import visitList from "../fixtures/VisitList/valid/sixth-visit.json";
import visitorDetail from "../fixtures/VisitorDetail/valid/identified.json";
import visitorList from "../fixtures/VisitorList/valid/week.json";

const Internal = Type.Boolean({
  description: "Whether this is your own traffic, which `traffic=human` leaves out.",
});
const VisitorId = Type.String({
  minLength: 1,
  maxLength: 128,
  description: "The anonymous visitor id the SDK keeps.",
});

export const ReadPage = Type.Object({
  path: Type.String({ minLength: 1, description: "The page path without the query string." }),
  route: nullable(Type.String({ description: "The route template, such as `/blog/[slug]`." })),
  title: nullable(Type.String()),
  referrer: nullable(Type.String({ description: "The referring URL." })),
});
export type ReadPage = Static<typeof ReadPage>;

export const EventsQuery = Type.Object({
  name: Type.Optional(
    Type.String({
      minLength: 1,
      maxLength: 64,
      description: "Only events with this name, such as `pageview`.",
    }),
  ),
});
export type EventsQuery = Static<typeof EventsQuery>;

export const EventRow = Type.Object({
  id: Id,
  name: EventName,
  ts: Type.String({
    format: "date-time",
    description: "When the event happened, clock-corrected.",
  }),
  visitor: VisitorId,
  session: Id,
  page: ReadPage,
  props: Props,
  groups: WireGroups,
  geo: Geo,
  device: Device,
  bot: BotVerdict,
  isInternal: Internal,
});
export type EventRow = Static<typeof EventRow>;

export const EventList = listOf(EventRow, { examples: [eventList] });
export type EventList = Static<typeof EventList>;

export const VisitorRow = Type.Object({
  id: VisitorId,
  firstSeen: Timestamp,
  lastSeen: Timestamp,
  sessions: Count,
  pageviews: Count,
  country: nullable(
    Type.String({ minLength: 2, maxLength: 2, description: "ISO 3166-1 alpha-2 country code." }),
  ),
  device: DeviceType,
  browser: nullable(Type.String()),
  isInternal: Internal,
  identified: Type.Boolean({ description: "Whether `identify` gave this visitor a user id." }),
});
export type VisitorRow = Static<typeof VisitorRow>;

export const VisitorList = listOf(VisitorRow, {
  examples: [visitorList],
});
export type VisitorList = Static<typeof VisitorList>;

export const Identity = Type.Object(
  {
    userId: Type.String({
      minLength: 1,
      maxLength: 128,
      description: "Your user id, from `identify`.",
    }),
    traits: Type.Record(Type.String(), PropValue, {
      description: "The traits sent with `identify`.",
    }),
  },
  { description: "Who the visitor is, from `identify`." },
);
export type Identity = Static<typeof Identity>;

export const SessionSummary = Type.Object({
  id: Id,
  startedAt: Timestamp,
  durationMs: Type.Number({
    minimum: 0,
    description: "Time from the session's first event to its last.",
  }),
  pageviews: Count,
  entryPage: Type.String({ description: "Path of the first event." }),
  exitPage: Type.String({ description: "Path of the last event." }),
  referrer: nullable(Type.String({ description: "Referrer of the first event." })),
});
export type SessionSummary = Static<typeof SessionSummary>;

export const ReturnedWithin = Type.Object(
  {
    day: Type.Boolean(),
    week: Type.Boolean(),
    month: Type.Boolean({ description: "Within 30 days." }),
  },
  {
    description:
      "Whether a later session started within 1, 7 or 30 days of the visitor's first session.",
  },
);
export type ReturnedWithin = Static<typeof ReturnedWithin>;

export const VisitorDetail = Type.Object(
  dataOf(
    Type.Object({
      id: VisitorId,
      firstSeen: Timestamp,
      lastSeen: Timestamp,
      sessions: Count,
      pageviews: Count,
      events: Type.Integer({ minimum: 0, description: "Events other than pageviews." }),
      visitCount: Type.Integer({ minimum: 0, description: "Sessions, counted as visits." }),
      daysActive: Type.Integer({ minimum: 0, description: "Distinct UTC days with events." }),
      medianDaysBetweenVisits: nullable(
        Type.Number({
          minimum: 0,
          description:
            "Median days between the starts of consecutive visits, to one decimal; null with one visit.",
        }),
      ),
      returnedWithin: ReturnedWithin,
      isInternal: Internal,
      identity: nullable(Identity),
      experiments: Type.Record(Type.String(), Type.String(), {
        description: "Experiment name to the variant this visitor was shown.",
      }),
      geo: Geo,
      device: Device,
      topPages: Type.Array(
        Type.Object({ value: Type.String({ description: "The path." }), pageviews: Count }),
        { description: "The five most viewed paths." },
      ),
      recentSessions: Type.Array(SessionSummary, {
        description: "The five latest sessions, newest first.",
      }),
      bot: BotDetail,
    }),
  ).properties,
  { examples: [visitorDetail] },
);
export type VisitorDetail = Static<typeof VisitorDetail>;

export const UpdateVisitor = Type.Object(
  {
    isInternal: Type.Boolean({
      description:
        "`true` marks the visitor, their events and sessions as internal; `false` unmarks them.",
    }),
  },
  { examples: [updateVisitor] },
);
export type UpdateVisitor = Static<typeof UpdateVisitor>;

export const UpdatedVisitor = Type.Object(
  dataOf(
    Type.Object({
      id: VisitorId,
      isInternal: Internal,
      eventsUpdated: Type.Integer({ minimum: 0, description: "Events that changed." }),
      sessionsUpdated: Type.Integer({ minimum: 0, description: "Sessions that changed." }),
    }),
  ).properties,
  { examples: [updatedVisitor] },
);
export type UpdatedVisitor = Static<typeof UpdatedVisitor>;

export const SessionRow = Type.Object({
  id: Id,
  visitorId: VisitorId,
  startedAt: Timestamp,
  lastEventAt: Timestamp,
  durationMs: Type.Number({ minimum: 0, description: "`lastEventAt` minus `startedAt`." }),
  pageviews: Count,
  events: Count,
  isBounce: Type.Boolean({ description: "Whether the session had at most one pageview." }),
  entryPath: Type.String({ description: "The first page's path." }),
  exitPath: Type.String({ description: "The last page's path." }),
  entryRoute: nullable(Type.String({ description: "The first page's route template." })),
  exitRoute: nullable(Type.String({ description: "The last page's route template." })),
  source: Source,
  geo: Geo,
  device: Device,
  bot: BotVerdict,
  isInternal: Internal,
});
export type SessionRow = Static<typeof SessionRow>;

export const SessionList = listOf(SessionRow, {
  examples: [sessionList],
});
export type SessionList = Static<typeof SessionList>;

export const SessionEvent = Type.Object({
  id: Id,
  name: EventName,
  ts: Timestamp,
  page: ReadPage,
  props: Props,
});
export type SessionEvent = Static<typeof SessionEvent>;

export const SessionEvents = Type.Object(
  {
    session: Type.Object(
      {
        id: Id,
        visitor: VisitorId,
        startedAt: Timestamp,
        durationMs: Type.Number({
          minimum: 0,
          description: "Time from the session's first event to its last.",
        }),
        bot: BotVerdict,
      },
      { description: "The session's highest bot score with every reason seen in it." },
    ),
    data: Type.Array(SessionEvent, { description: "The session's events, oldest first." }),
    nextCursor: nullable(
      Type.String({ description: "Pass as `cursor` for the next page; null on the last page." }),
    ),
  },
  { examples: [sessionEvents] },
);
export type SessionEvents = Static<typeof SessionEvents>;

export const VisitPage = Type.Object({
  path: Type.String({ minLength: 1 }),
  at: Timestamp,
  timeOnPageMs: Type.Number({
    minimum: 0,
    description: "Time until the next pageview in the visit; 0 for the last page.",
  }),
  scrollDepth: nullable(
    Type.Number({
      minimum: 0,
      maximum: 1,
      description: "Deepest scroll on the page, from 0 to 1; null when the SDK sent none.",
    }),
  ),
});
export type VisitPage = Static<typeof VisitPage>;

export const VisitAction = Type.Object(
  { at: Timestamp, name: EventName, props: Props },
  {
    description:
      "An event other than `pageview`, `web_vital`, `engagement` and `scroll_depth`, such as a click or form submit.",
  },
);
export type VisitAction = Static<typeof VisitAction>;

export const Visit = Type.Object({
  visitNumber: Type.Integer({ minimum: 1, description: "1 for the visitor's first visit." }),
  sessionId: Id,
  startedAt: Timestamp,
  endedAt: Type.String({
    format: "date-time",
    description: "When the visit's last event happened.",
  }),
  sincePreviousVisitMs: nullable(
    Type.Number({
      minimum: 0,
      description: "Time since the previous visit started; null for the first visit.",
    }),
  ),
  entryUrl: Type.String({
    format: "uri",
    description: "The first page's URL, without the query string.",
  }),
  exitPath: Type.String({ description: "The last event's path." }),
  source: Source,
  pages: Type.Array(VisitPage, { description: "Pageviews in order." }),
  actions: Type.Array(VisitAction),
});
export type Visit = Static<typeof Visit>;

export const VisitList = listOf(Visit, { examples: [visitList] });
export type VisitList = Static<typeof VisitList>;

export const PersonProject = Type.Object({
  projectId: Id,
  visitorId: VisitorId,
  firstSeen: Timestamp,
  visits: Type.Integer({ minimum: 0, description: "Sessions in this project." }),
});
export type PersonProject = Static<typeof PersonProject>;

export const PersonVisit = Type.Object({
  projectId: Id,
  visitNumber: Type.Integer({ minimum: 1, description: "The visit's number within its project." }),
  startedAt: Timestamp,
  entryUrl: Type.String({ format: "uri", description: "The first page's URL." }),
  pages: Type.Integer({ minimum: 0, description: "Pageviews in the visit." }),
});
export type PersonVisit = Static<typeof PersonVisit>;

export const Person = Type.Object({
  userId: Type.String({
    minLength: 1,
    maxLength: 128,
    description: "Your user id, from `identify`.",
  }),
  traits: Props,
  firstSeen: Timestamp,
  lastSeen: Timestamp,
  firstProject: Type.String({
    minLength: 1,
    description: "The project the user was first seen in.",
  }),
  firstSource: Source,
  projects: Type.Array(PersonProject, {
    description: "Each project the user was identified in, with that project's visitor id.",
  }),
  visits: Type.Array(PersonVisit, { description: "Every visit in every project, oldest first." }),
});
export type Person = Static<typeof Person>;

export const PersonResponse = Type.Object(dataOf(Person).properties, {
  examples: [personResponse],
});
export type PersonResponse = Static<typeof PersonResponse>;

export const PersonRow = Type.Object({
  userId: Type.String({
    minLength: 1,
    maxLength: 128,
    description: "Your user id, from `identify`.",
  }),
  traits: Props,
  firstSeen: Timestamp,
  lastSeen: Timestamp,
  firstProject: Type.String({
    minLength: 1,
    description: "The project the user was first seen in.",
  }),
  projects: Type.Integer({ minimum: 0, description: "Projects the user was identified in." }),
  visits: Type.Integer({ minimum: 0, description: "Sessions across those projects." }),
});
export type PersonRow = Static<typeof PersonRow>;

export const PeopleList = listOf(PersonRow, { examples: [peopleList] });
export type PeopleList = Static<typeof PeopleList>;
