import {
  ApiError,
  ClientLogBatch,
  ClientLogResult,
  LogList,
  LogsQuery,
} from "@remcostoeten/analytics-contract";
import { storeClientReports } from "@remcostoeten/analytics-engine";
import type { EngineError, LogStore, ProjectRecord } from "@remcostoeten/analytics-engine";
import { ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";
import { Elysia, t } from "elysia";

import type { AccessDeps, Caller } from "../../access/types";
import { access } from "../../plugins/access";
import { failure } from "../../plugins/error-handler";
import { errorResponses } from "../../plugins/error-responses";
import { ingestCredentials } from "../events/service";
import { readGate } from "../reads/guard";
import type { ReadsOptions, Set } from "../reads/guard";
import { eventStream } from "../reads/live";
import type { WidgetDeps } from "../widget/service";
import { logLines, logQuery, logStream, readReport } from "./service";

const tags = ["Dev widget"];
const responses = { ...errorResponses, 429: errorResponses[400] };
const windowSeconds = 60;

type Route = { request: Request; caller: Caller; project: ProjectRecord | null; set: Set };

/**
 * @name logsModule
 * @description The dev widget's log: `GET /v2/projects/:project/logs` at the `admin` level, which
 * long-polls or streams the engine's decisions like `realtime/events`, and
 * `POST /v2/projects/:project/logs/client`, where the widget build of the SDK reports its `drop`
 * and `error` outcomes with the ingest key, up to 20 per request and 16 KB, while the project has
 * `widgetReports` on.
 *
 * @example
 * app.use(logsModule(deps, reads, widget, docsBase));
 */
export function logsModule(
  deps: AccessDeps,
  reads: ReadsOptions,
  widget: WidgetDeps,
  docsBase: string,
) {
  const gate = readGate(reads, docsBase);

  function read(store: LogStore) {
    return ({ request, caller, project, set }: Route) =>
      gate.answer(
        request,
        caller,
        project,
        set,
        "private",
        async (params, id): Promise<Result<LogList | Response, EngineError>> => {
          const query = logQuery(params, id, request.headers.get("last-event-id"));
          if (!query.ok) return query;
          if (request.headers.get("accept")?.includes("text/event-stream")) {
            return ok(logStream(store, query.value, reads.live, request.signal));
          }
          return logLines(store, query.value, { ms: reads.live.waitMs, signal: request.signal });
        },
      );
  }

  return new Elysia({ name: "logs" })
    .use(access(deps, docsBase))
    .model({ ApiError })
    .get("/projects/:project/logs", read(widget.logs), {
      query: LogsQuery,
      access: "admin",
      response: { 200: t.Union([LogList, eventStream]), ...responses },
      detail: {
        summary: "Log stream",
        description:
          "Every ingest and engine decision that is not a plain accepted event: rejected events with their code and field, duplicates, rate limited requests, bot verdicts from `suspect` up, one line per accepted batch, job runs and the SDK's own reports. Without `after` the last 100 lines; with it the newer lines as soon as they arrive or an empty page after 25 seconds; `Accept: text/event-stream` streams them. Filter with `level`, `kind`, `source`, `visitor` and `q`. Lines are kept for 7 days and never hold IP addresses, emails or prop values.",
        tags,
      },
    })
    .post(
      "/projects/:project/logs/client",
      async ({ body, params, request, set, status }) => {
        const stored = await storeClientReports(
          {
            projects: widget.keys,
            hasher: deps.hasher,
            limiter: widget.limiter,
            logs: widget.logs,
            clock: { now: deps.clock },
          },
          {
            project: params.project,
            credentials: ingestCredentials(request),
            origin: request.headers.get("origin"),
            logs: body.logs,
          },
          { limit: widget.reportsPerMinute, windowSeconds },
        );
        if (stored.ok) return status(202, stored.value);
        const failed = failure(stored.error, set.headers, docsBase);
        set.status = failed.status;
        return failed.body;
      },
      {
        parse: "text",
        transform: (context) => {
          const raw: unknown = context.body;
          if (typeof raw !== "string") return;
          const parsed = readReport(raw);
          if (parsed.ok) {
            Object.assign(context, { body: parsed.value });
            return;
          }
          const failed = failure(parsed.error, context.set.headers, docsBase);
          // Transform cannot return a response; a thrown status is Elysia's documented early exit.
          throw parsed.error.code === "PAYLOAD_TOO_LARGE"
            ? context.status(413, failed.body)
            : context.status(400, failed.body);
        },
        body: ClientLogBatch,
        response: {
          202: ClientLogResult,
          400: "ApiError",
          401: "ApiError",
          403: "ApiError",
          413: "ApiError",
          429: "ApiError",
          500: "ApiError",
          503: "ApiError",
        },
        detail: {
          summary: "Report SDK outcomes",
          description:
            "The widget build of the SDK posts its `drop` and `error` outcomes here in batches of up to 20 (`{ logs: [...] }`, at most 16 KB), with the same key as `POST /v2/events`. They are stored as `sdk` log lines, with email and IP addresses replaced. Refused with `WIDGET_REPORTS_DISABLED` unless the project has `widgetReports` on, and rate limited per project.",
          tags,
        },
      },
    );
}
