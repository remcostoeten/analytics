import type {
  EventList,
  PeopleList,
  PersonResponse,
  SessionEvents,
  SessionList,
  UpdatedVisitor,
  UpdateVisitor,
  VisitList,
  VisitorDetail,
  VisitorList,
} from "@spoar/contract";
import type { SessionID, UserID, VisitorID } from "@spoar/shared/semantic";

import { toBody } from "../body";
import { basePath, toQuery } from "../scope";
import type { ClientResult, Page, ScopeState, Send } from "../types";

export type EventsOptions = Page & { name?: string };

export type DetailReads = {
  events: (options?: EventsOptions) => ClientResult<EventList>;
  visitors: (options?: Page) => ClientResult<VisitorList>;
  sessions: (options?: Page) => ClientResult<SessionList>;
};

export type ProjectDetailReads = DetailReads & {
  visitor: (visitor: VisitorID) => ClientResult<VisitorDetail>;
  visitorVisits: (visitor: VisitorID, options?: Page) => ClientResult<VisitList>;
  updateVisitor: (visitor: VisitorID, changes: UpdateVisitor) => ClientResult<UpdatedVisitor>;
  sessionEvents: (session: SessionID, options?: Page) => ClientResult<SessionEvents>;
};

export type PeopleReads = {
  people: (options?: Page) => ClientResult<PeopleList>;
  person: (userId: UserID) => ClientResult<PersonResponse>;
};

/**
 * @name detailReads
 * @description The visitor-level terminals: raw `events`, the `visitors` and `sessions` lists on
 * any scope, and on a project scope one visitor with its visits, the internal-traffic flag and
 * one session's events. Lists take the scope's range and filters; single rows take none.
 *
 * @example
 * const reads = detailReads(send, { project: "skriuw", period: "24h", filter: {} });
 * await reads.events({ name: "signup", limit: 100 });
 */
export function detailReads(send: Send, state: ScopeState): ProjectDetailReads {
  const base = basePath(state);
  const query = toQuery(state);

  function visitorPath(visitor: VisitorID) {
    return `${base}/visitors/${encodeURIComponent(visitor)}`;
  }

  return {
    events: (options = {}) =>
      send.json<EventList>({
        method: "GET",
        path: `${base}/events`,
        query: { ...query, name: options.name, limit: options.limit, cursor: options.cursor },
      }),
    visitors: (options = {}) =>
      send.json<VisitorList>({
        method: "GET",
        path: `${base}/visitors`,
        query: { ...query, limit: options.limit, cursor: options.cursor },
      }),
    sessions: (options = {}) =>
      send.json<SessionList>({
        method: "GET",
        path: `${base}/sessions`,
        query: { ...query, limit: options.limit, cursor: options.cursor },
      }),
    visitor: (visitor) => send.json<VisitorDetail>({ method: "GET", path: visitorPath(visitor) }),
    visitorVisits: (visitor, options = {}) =>
      send.json<VisitList>({
        method: "GET",
        path: `${visitorPath(visitor)}/visits`,
        query: { limit: options.limit, cursor: options.cursor },
      }),
    updateVisitor: (visitor, changes) =>
      send.json<UpdatedVisitor>({
        method: "PATCH",
        path: visitorPath(visitor),
        body: toBody(changes),
      }),
    sessionEvents: (session, options = {}) =>
      send.json<SessionEvents>({
        method: "GET",
        path: `${base}/sessions/${encodeURIComponent(session)}/events`,
        query: { limit: options.limit, cursor: options.cursor },
      }),
  };
}

/**
 * @name peopleReads
 * @description The identified-user terminals of the combined scope: `people` across every
 * project and one `person` by user id.
 *
 * @example
 * await peopleReads(send).person("user_123");
 */
export function peopleReads(send: Send): PeopleReads {
  return {
    people: (options = {}) =>
      send.json<PeopleList>({
        method: "GET",
        path: "/v2/people",
        query: { limit: options.limit, cursor: options.cursor },
      }),
    person: (userId) =>
      send.json<PersonResponse>({
        method: "GET",
        path: `/v2/people/${encodeURIComponent(userId)}`,
      }),
  };
}
