import { errorCatalog } from "@remcostoeten/analytics-contract";
import type { ApiError } from "@remcostoeten/analytics-contract";
import type { EngineError, Logger } from "@remcostoeten/analytics-engine";
import { Elysia, ValidationError } from "elysia";

import { readRequestId } from "./request-id";

type Headers = { [name: string]: unknown };

export type Failure = {
  status: number;
  body: ApiError;
};

type FieldError = { path: string; message: string };

/**
 * @name failure
 * @description Turns an `EngineError` into the API's error envelope and status from the contract's
 * catalog, with the request id and a docs link. For `RATE_LIMITED` it also sets `Retry-After`.
 *
 * @example
 * const { status, body } = failure(error, set.headers, "https://api.remcostoeten.nl/v2/openapi");
 */
export function failure(error: EngineError, headers: Headers, docsBase: string): Failure {
  const retryAfter = error.details?.retryAfterSeconds;
  if (error.code === "RATE_LIMITED" && typeof retryAfter === "number") {
    headers["retry-after"] = String(retryAfter);
  }
  return {
    status: errorCatalog[error.code].status,
    body: {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
        requestId: readRequestId(headers),
        docs: `${docsBase}#errors/${error.code}`,
      },
    },
  };
}

function fields(error: unknown): FieldError[] {
  if (!(error instanceof ValidationError)) return [];
  return error.all.map((item) => ({
    path: "path" in item ? String(item.path) : "",
    message: item.summary ?? ("message" in item ? String(item.message) : "is invalid"),
  }));
}

function describe(error: unknown) {
  return error instanceof Error ? (error.stack ?? error.message) : String(error);
}

/**
 * @name errorHandler
 * @description Maps Elysia's own errors to the error envelope: a failed schema to
 * `VALIDATION_FAILED` with each field, unreadable JSON to `VALIDATION_FAILED`, an unknown route
 * to `NOT_FOUND`, and anything thrown to `INTERNAL`, logged with its stack. A thrown `status()`
 * is a deliberate response and passes through unchanged. The message of an
 * `INTERNAL` never includes internals.
 *
 * @example
 * new Elysia().use(errorHandler({ docsBase, logger: (requestId) => jsonLogger(console.log, { requestId }) }));
 */
export function errorHandler(options: { docsBase: string; logger: (requestId: string) => Logger }) {
  return new Elysia({ name: "error-handler" }).onError(
    { as: "global" },
    ({ code, error, set, request }) => {
      if (typeof code === "number") return;
      const engineError: EngineError =
        code === "VALIDATION"
          ? {
              code: "VALIDATION_FAILED",
              message: "The request does not match the schema",
              details: { fields: fields(error) },
            }
          : code === "PARSE"
            ? { code: "VALIDATION_FAILED", message: "The body is not valid JSON" }
            : code === "NOT_FOUND"
              ? { code: "NOT_FOUND", message: "No route matches this path" }
              : { code: "INTERNAL", message: "Internal error" };
      if (engineError.code === "INTERNAL") {
        options.logger(readRequestId(set.headers)).error("request failed", {
          method: request.method,
          path: new URL(request.url).pathname,
          code: String(code),
          stack: describe(error),
        });
      }
      const { status, body } = failure(engineError, set.headers, options.docsBase);
      set.status = status;
      return body;
    },
  );
}
