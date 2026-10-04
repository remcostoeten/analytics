import { ApiError, WireEvent } from "@spoar/contract";
import type { Engine, IngestCount, Logger } from "@spoar/engine";
import { Elysia } from "elysia";

import { failure } from "../../plugins/error-handler";
import { readRequestId } from "../../plugins/request-id";
import { IngestBody, ingestResponses } from "./model";
import { ingestEvents, readBody } from "./service";

export type EventsOptions = {
  engine: (logger: Logger) => Engine;
  logger: (requestId: string) => Logger;
  clock: () => Date;
  docsBase: string;
  isAdmin: (headers: Headers) => Promise<boolean>;
  count?: (at: Date, count: IngestCount) => Promise<unknown>;
};

const none = { requests: 1, accepted: 0, duplicates: 0, rejected: 0, rateLimited: 0 };

/**
 * @name eventsModule
 * @description `POST /v2/events`: a `text/plain` or `application/json` batch of up to 50 events and
 * 60 KB, with the public key in `X-Project-Key` or `?key=` from an allowed origin, or
 * `Authorization: Bearer sk_...`. Answers
 * 202 with `{ accepted, duplicates, rejected }`, or the error envelope. Each request is added to
 * the hourly ingest counters when `count` is given.
 *
 * @example
 * new Elysia({ prefix: "/v2" }).use(eventsModule({ engine, logger, clock: () => new Date(), docsBase }));
 */
export function eventsModule(options: EventsOptions) {
  return new Elysia({ name: "events" }).model({ WireEvent, ApiError }).post(
    "/events",
    async ({ body, request, set, status }) => {
      const logger = options.logger(readRequestId(set.headers));
      const admin = await options.isAdmin(request.headers);
      const receivedAt = options.clock();
      const result = await ingestEvents(options.engine(logger), body, request, receivedAt, admin);
      await options.count?.(
        receivedAt,
        result.ok
          ? {
              ...none,
              accepted: result.value.accepted,
              duplicates: result.value.duplicates,
              rejected: result.value.rejected.length,
            }
          : { ...none, rateLimited: result.error.code === "RATE_LIMITED" ? 1 : 0 },
      );
      if (result.ok) return status(202, result.value);
      if (result.error.cause) {
        logger.error("ingest failed", {
          code: result.error.code,
          cause: result.error.cause.message,
        });
      }
      const failed = failure(result.error, set.headers, options.docsBase);
      set.status = failed.status;
      return failed.body;
    },
    {
      parse: "text",
      transform: (context) => {
        const raw: unknown = context.body;
        if (typeof raw !== "string") return;
        const read = readBody(raw);
        if (read.ok) {
          Object.assign(context, { body: read.value });
          return;
        }
        const failed = failure(read.error, context.set.headers, options.docsBase);
        // Transform cannot return a response; a thrown status is Elysia's documented early exit.
        throw read.error.code === "PAYLOAD_TOO_LARGE"
          ? context.status(413, failed.body)
          : context.status(400, failed.body);
      },
      body: IngestBody,
      response: ingestResponses,
      detail: {
        summary: "Send a batch of events",
        description:
          "The body is an ingest envelope, sent as text/plain so browsers skip the preflight, or as application/json from a server. Each event in `events` is a WireEvent and is checked on its own: a bad event is reported by index in `rejected` while the rest are stored.",
        tags: ["Ingest"],
      },
    },
  );
}
