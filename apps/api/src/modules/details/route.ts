import {
  EventList,
  SessionEvents,
  SessionList,
  UpdatedVisitor,
  UpdateVisitor,
  VisitList,
  VisitorDetail,
  VisitorList,
} from "@remcostoeten/analytics-contract";
import { Elysia, t } from "elysia";

import type { AccessDeps } from "../../access/types";
import { access } from "../../plugins/access";
import { errorResponses } from "../../plugins/error-responses";
import { download } from "../reads/export";
import { readGate } from "../reads/guard";
import type { ReadsOptions } from "../reads/guard";
import {
  listEvents,
  listSessions,
  listVisitors,
  markVisitor,
  sessionTrail,
  visitorDetail,
  visitorVisits,
} from "./service";
import { eventsQuery, listQuery, pageQuery } from "../reads/query";

const tags = ["Visitor-level reads"];
const responses = { ...errorResponses, 429: errorResponses[400] };

/**
 * @name detailsModule
 * @description The visitor-level reads under `/v2/projects/:project` at the `detail` level: raw
 * events, visitors and one visitor in full, their visits, sessions and one session's events. An
 * admin can mark a visitor as internal. Every list also answers `format=csv|json|sql` as one download. These answers are never cached publicly.
 *
 * @example
 * app.use(detailsModule(deps, reads, docsBase));
 */
export function detailsModule(deps: AccessDeps, options: ReadsOptions, docsBase: string) {
  const gate = readGate(options, docsBase);
  const store = options.details;

  return new Elysia({ name: "details" })
    .use(access(deps, docsBase))
    .get(
      "/projects/:project/events",
      ({ request, caller, project, set }) =>
        gate.list(request, caller, project, set, "private", "events", (params, id) =>
          listEvents(store, params, [id], options.clock()),
        ),
      {
        query: eventsQuery,
        access: "detail",
        response: { 200: t.Union([EventList, download]), ...responses },
        detail: {
          summary: "Raw events",
          description: "Newest first; `name` keeps one event name.",
          tags,
        },
      },
    )
    .get(
      "/projects/:project/visitors",
      ({ request, caller, project, set }) =>
        gate.list(request, caller, project, set, "private", "visitors", (params, id) =>
          listVisitors(store, params, [id], options.clock()),
        ),
      {
        query: listQuery,
        access: "detail",
        response: { 200: t.Union([VisitorList, download]), ...responses },
        detail: {
          summary: "Visitors",
          description: "Visitors active in the range, most recently seen first.",
          tags,
        },
      },
    )
    .get(
      "/projects/:project/visitors/:visitor",
      ({ request, caller, project, params: path, set }) =>
        gate.answer(request, caller, project, set, "private", (_, id) =>
          visitorDetail(store, id, path.visitor, options.clock()),
        ),
      {
        access: "detail",
        response: { 200: VisitorDetail, ...responses },
        detail: {
          summary: "One visitor",
          description:
            "Identity, experiments, geo, device, top pages, recent sessions, how often they return, and `bot`: the highest score of their events with its verdict and the signal breakdown behind it (null where a signal was not evaluated, and for events stored before the breakdown existed).",
          tags,
        },
      },
    )
    .patch(
      "/projects/:project/visitors/:visitor",
      ({ request, caller, project, params: path, body, set }) =>
        gate.answer(request, caller, project, set, "private", (_, id) =>
          markVisitor(store, id, path.visitor, body.isInternal),
        ),
      {
        access: "admin",
        body: UpdateVisitor,
        response: { 200: UpdatedVisitor, ...responses },
        detail: {
          summary: "Mark a visitor as internal",
          description: "Updates the visitor, their events and their sessions in this project.",
          tags,
        },
      },
    )
    .get(
      "/projects/:project/visitors/:visitor/visits",
      ({ request, caller, project, params: path, set }) =>
        gate.list(request, caller, project, set, "private", "visits", (params, id) =>
          visitorVisits(store, params, id, path.visitor),
        ),
      {
        query: pageQuery,
        access: "detail",
        response: { 200: t.Union([VisitList, download]), ...responses },
        detail: {
          summary: "A visitor's visits",
          description:
            "Oldest first and numbered, with pages, time on page, scroll depth and actions.",
          tags,
        },
      },
    )
    .get(
      "/projects/:project/sessions",
      ({ request, caller, project, set }) =>
        gate.list(request, caller, project, set, "private", "sessions", (params, id) =>
          listSessions(store, params, [id], options.clock()),
        ),
      {
        query: listQuery,
        access: "detail",
        response: { 200: t.Union([SessionList, download]), ...responses },
        detail: {
          summary: "Sessions",
          description: "Sessions with events in the range, newest first.",
          tags,
        },
      },
    )
    .get(
      "/projects/:project/sessions/:session/events",
      ({ request, caller, project, params: path, set }) =>
        gate.list(request, caller, project, set, "private", "session_events", (params, id) =>
          sessionTrail(store, params, id, path.session),
        ),
      {
        query: pageQuery,
        access: "detail",
        response: { 200: t.Union([SessionEvents, download]), ...responses },
        detail: {
          summary: "One session's events",
          description: "Every event in order, paged with a cursor.",
          tags,
        },
      },
    );
}
