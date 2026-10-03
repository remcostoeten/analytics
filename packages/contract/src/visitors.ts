import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { BotDetail, BotVerdict, Device, Geo, Props, Source } from "./common";
import { DeviceType, EventName } from "./enums";
import { WireGroups } from "./events";
import { Count, dataOf, Id, listOf, Milliseconds, nullable, Ratio, Timestamp, Url } from "./schema";

export const ReadPage = Type.Object({
  path: Type.String({ minLength: 1 }),
  route: nullable(Type.String()),
  title: nullable(Type.String()),
  referrer: nullable(Type.String()),
});
export type ReadPage = Static<typeof ReadPage>;

export const EventsQuery = Type.Object({ name: Type.Optional(EventName) });
export type EventsQuery = Static<typeof EventsQuery>;

export const EventRow = Type.Object({
  id: Id,
  name: EventName,
  ts: Timestamp,
  visitor: Id,
  session: Id,
  page: ReadPage,
  props: Props,
  groups: WireGroups,
  geo: Geo,
  device: Device,
  bot: BotVerdict,
  isInternal: Type.Boolean(),
});
export type EventRow = Static<typeof EventRow>;

export const EventList = listOf(EventRow);
export type EventList = Static<typeof EventList>;

export const VisitorRow = Type.Object({
  id: Id,
  firstSeen: Timestamp,
  lastSeen: Timestamp,
  sessions: Count,
  pageviews: Count,
  country: nullable(Type.String({ minLength: 2, maxLength: 2 })),
  device: DeviceType,
  browser: nullable(Type.String()),
  isInternal: Type.Boolean(),
  identified: Type.Boolean(),
});
export type VisitorRow = Static<typeof VisitorRow>;

export const VisitorList = listOf(VisitorRow);
export type VisitorList = Static<typeof VisitorList>;

export const Identity = Type.Object({ userId: Id, traits: Props });
export type Identity = Static<typeof Identity>;

export const SessionSummary = Type.Object({
  id: Id,
  startedAt: Timestamp,
  durationMs: Milliseconds,
  pageviews: Count,
  entryPage: Type.String(),
  exitPage: Type.String(),
  referrer: nullable(Type.String()),
});
export type SessionSummary = Static<typeof SessionSummary>;

export const ReturnedWithin = Type.Object({
  day: Type.Boolean(),
  week: Type.Boolean(),
  month: Type.Boolean(),
});
export type ReturnedWithin = Static<typeof ReturnedWithin>;

export const VisitorDetail = dataOf(
  Type.Object({
    id: Id,
    firstSeen: Timestamp,
    lastSeen: Timestamp,
    sessions: Count,
    pageviews: Count,
    events: Count,
    visitCount: Count,
    daysActive: Count,
    medianDaysBetweenVisits: nullable(Type.Number({ minimum: 0 })),
    returnedWithin: ReturnedWithin,
    isInternal: Type.Boolean(),
    identity: nullable(Identity),
    experiments: Type.Record(Type.String(), Type.String()),
    geo: Geo,
    device: Device,
    topPages: Type.Array(Type.Object({ value: Type.String(), pageviews: Count })),
    recentSessions: Type.Array(SessionSummary),
    bot: BotDetail,
  }),
);
export type VisitorDetail = Static<typeof VisitorDetail>;

export const UpdateVisitor = Type.Object({ isInternal: Type.Boolean() });
export type UpdateVisitor = Static<typeof UpdateVisitor>;

export const UpdatedVisitor = dataOf(
  Type.Object({
    id: Id,
    isInternal: Type.Boolean(),
    eventsUpdated: Count,
    sessionsUpdated: Count,
  }),
);
export type UpdatedVisitor = Static<typeof UpdatedVisitor>;

export const SessionRow = Type.Object({
  id: Id,
  visitorId: Id,
  startedAt: Timestamp,
  lastEventAt: Timestamp,
  durationMs: Milliseconds,
  pageviews: Count,
  events: Count,
  isBounce: Type.Boolean(),
  entryPath: Type.String(),
  exitPath: Type.String(),
  entryRoute: nullable(Type.String()),
  exitRoute: nullable(Type.String()),
  source: Source,
  geo: Geo,
  device: Device,
  bot: BotVerdict,
  isInternal: Type.Boolean(),
});
export type SessionRow = Static<typeof SessionRow>;

export const SessionList = listOf(SessionRow);
export type SessionList = Static<typeof SessionList>;

export const SessionEvent = Type.Object({
  id: Id,
  name: EventName,
  ts: Timestamp,
  page: ReadPage,
  props: Props,
});
export type SessionEvent = Static<typeof SessionEvent>;

export const SessionEvents = Type.Object({
  session: Type.Object({
    id: Id,
    visitor: Id,
    startedAt: Timestamp,
    durationMs: Milliseconds,
    bot: BotVerdict,
  }),
  data: Type.Array(SessionEvent),
  nextCursor: nullable(Type.String()),
});
export type SessionEvents = Static<typeof SessionEvents>;

export const VisitPage = Type.Object({
  path: Type.String({ minLength: 1 }),
  at: Timestamp,
  timeOnPageMs: Milliseconds,
  scrollDepth: nullable(Ratio),
});
export type VisitPage = Static<typeof VisitPage>;

export const VisitAction = Type.Object({ at: Timestamp, name: EventName, props: Props });
export type VisitAction = Static<typeof VisitAction>;

export const Visit = Type.Object({
  visitNumber: Type.Integer({ minimum: 1 }),
  sessionId: Id,
  startedAt: Timestamp,
  endedAt: Timestamp,
  sincePreviousVisitMs: nullable(Milliseconds),
  entryUrl: Url,
  exitPath: Type.String(),
  source: Source,
  pages: Type.Array(VisitPage),
  actions: Type.Array(VisitAction),
});
export type Visit = Static<typeof Visit>;

export const VisitList = listOf(Visit);
export type VisitList = Static<typeof VisitList>;

export const PersonProject = Type.Object({
  projectId: Id,
  visitorId: Id,
  firstSeen: Timestamp,
  visits: Count,
});
export type PersonProject = Static<typeof PersonProject>;

export const PersonVisit = Type.Object({
  projectId: Id,
  visitNumber: Type.Integer({ minimum: 1 }),
  startedAt: Timestamp,
  entryUrl: Url,
  pages: Count,
});
export type PersonVisit = Static<typeof PersonVisit>;

export const Person = Type.Object({
  userId: Id,
  traits: Props,
  firstSeen: Timestamp,
  lastSeen: Timestamp,
  firstProject: Id,
  firstSource: Source,
  projects: Type.Array(PersonProject),
  visits: Type.Array(PersonVisit),
});
export type Person = Static<typeof Person>;

export const PersonResponse = dataOf(Person);
export type PersonResponse = Static<typeof PersonResponse>;

export const PersonRow = Type.Object({
  userId: Id,
  traits: Props,
  firstSeen: Timestamp,
  lastSeen: Timestamp,
  firstProject: Id,
  projects: Count,
  visits: Count,
});
export type PersonRow = Static<typeof PersonRow>;

export const PeopleList = listOf(PersonRow);
export type PeopleList = Static<typeof PeopleList>;
