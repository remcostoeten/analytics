import {
  ActiveVisitors,
  ActiveVisitorsQuery,
  Overview,
  WidgetSession,
} from "@remcostoeten/analytics-contract";
import { Elysia } from "elysia";

import type { AccessDeps } from "../../access/types";
import { access } from "../../plugins/access";
import { failure } from "../../plugins/error-handler";
import { errorResponses } from "../../plugins/error-responses";
import { readGate } from "../reads/guard";
import type { ReadsOptions } from "../reads/guard";
import { activeVisitors, overviewCache, startWidget } from "./service";
import type { WidgetDeps } from "./service";

const tags = ["Dev widget"];
const responses = { ...errorResponses, 429: errorResponses[400] };

/**
 * @name widgetModule
 * @description The dev widget's routes: `GET /v2/widget/session`, the bootstrap called with the
 * admin session cookie from the customer site, which answers a 15-minute widget token; the
 * visitors active in the last five minutes at the `detail` level; and the project overview at the
 * `project` level, composed from the existing reads and cached for 10 seconds per project.
 *
 * @example
 * app.use(widgetModule(deps, reads, widget, docsBase));
 */
export function widgetModule(
  deps: AccessDeps,
  reads: ReadsOptions,
  widget: WidgetDeps,
  docsBase: string,
) {
  const gate = readGate(reads, docsBase);
  const overview = overviewCache(
    {
      reads: reads.store,
      speed: reads.speed,
      issues: reads.issues,
      logs: widget.logs,
      widget: widget.store,
    },
    reads.clock,
  );

  return new Elysia({ name: "widget" })
    .use(access(deps, docsBase))
    .get(
      "/widget/session",
      async ({ request, set }) => {
        set.headers["cache-control"] = "private, no-store";
        const started = await startWidget(deps, widget, request.headers);
        if (started.ok) return started.value;
        const failed = failure(started.error, set.headers, docsBase);
        set.status = failed.status;
        return failed.body;
      },
      {
        response: { 200: WidgetSession, ...errorResponses },
        detail: {
          summary: "Start the dev widget",
          description:
            "Called from the customer site with `credentials: include`. The project is the one whose `allowedOrigins` lists the `Origin` header; the caller needs the admin session cookie and admin rights on that project. Answers a widget token (`wt_`, 15 minutes, `admin` scope, this project only) for the other widget reads, so the cookie is never sent again. Call it again to refresh. CORS allows credentials on this route for any origin a project lists.",
          tags,
        },
      },
    )
    .get(
      "/projects/:project/realtime/visitors",
      ({ request, caller, project, set }) =>
        gate.answer(request, caller, project, set, "private", (params, id) =>
          activeVisitors(widget.store, id, params, reads.clock()),
        ),
      {
        query: ActiveVisitorsQuery,
        access: "detail",
        response: { 200: ActiveVisitors, ...responses },
        detail: {
          summary: "Active visitors",
          description:
            "One row per visitor seen in the last five minutes, newest activity first: their session, latest pageview, referrer, place, device, pages and duration this session, bot score, and whether they are identified (never the user id). `limit` from 1 to 200, default 50.",
          tags,
        },
      },
    )
    .get(
      "/projects/:project/overview",
      ({ request, caller, project, set }) =>
        gate.answer(request, caller, project, set, "private", (_, id) => overview(id)),
      {
        access: "project",
        response: { 200: Overview, ...responses },
        detail: {
          summary: "Overview",
          description:
            "The widget's status numbers in one answer: visitors online, pageviews per minute for the last ten minutes, today's totals, the last day's ingest and bot numbers, p75 speed over seven days, errors, today's top pages, referrers and countries, and the newest release. Cached for 10 seconds per project.",
          tags,
        },
      },
    );
}
