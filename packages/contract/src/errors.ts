import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { oneOf } from "./schema";
import notFound from "../fixtures/ApiError/valid/not-found.json";

type LogLevel = "info" | "warn" | "error";

type ErrorSpec = {
  status: number;
  retryable: boolean;
  level: LogLevel;
  docs: string;
};

export const errorCodes = [
  "VALIDATION_FAILED",
  "UNAUTHORIZED",
  "AUTH_REQUIRED",
  "FORBIDDEN_ORIGIN",
  "ORIGIN_NOT_ALLOWED",
  "FORBIDDEN",
  "WIDGET_REPORTS_DISABLED",
  "NOT_FOUND",
  "CONFLICT",
  "PAYLOAD_TOO_LARGE",
  "RATE_LIMITED",
  "INTERNAL",
  "UNAVAILABLE",
] as const;

export type ErrorCode = (typeof errorCodes)[number];

export const errorCatalog = {
  VALIDATION_FAILED: {
    status: 400,
    retryable: false,
    level: "info",
    docs: "Body, query or path fails the schema; details lists each field.",
  },
  UNAUTHORIZED: {
    status: 401,
    retryable: false,
    level: "info",
    docs: "No or invalid session, token or key.",
  },
  AUTH_REQUIRED: {
    status: 401,
    retryable: false,
    level: "info",
    docs: "The widget bootstrap was called without a signed-in session cookie.",
  },
  FORBIDDEN_ORIGIN: {
    status: 403,
    retryable: false,
    level: "warn",
    docs: "The public key was used from an origin that is not in the project's allowed origins.",
  },
  ORIGIN_NOT_ALLOWED: {
    status: 403,
    retryable: false,
    level: "info",
    docs: "The widget bootstrap's Origin is not in any project's allowed origins.",
  },
  FORBIDDEN: {
    status: 403,
    retryable: false,
    level: "info",
    docs: "The token scope or the signed-in member's role does not allow the action.",
  },
  WIDGET_REPORTS_DISABLED: {
    status: 403,
    retryable: false,
    level: "info",
    docs: "SDK client reports were sent to a project whose widgetReports switch is off.",
  },
  NOT_FOUND: {
    status: 404,
    retryable: false,
    level: "info",
    docs: "Unknown route, project, visitor or session, or a private project without access.",
  },
  CONFLICT: {
    status: 409,
    retryable: false,
    level: "info",
    docs: "A project with this id already exists.",
  },
  PAYLOAD_TOO_LARGE: {
    status: 413,
    retryable: false,
    level: "warn",
    docs: "The ingest body is over 60 KB or has more than 50 events, or a client report body is over 16 KB.",
  },
  RATE_LIMITED: {
    status: 429,
    retryable: true,
    level: "warn",
    docs: "The per-IP-hash limit was hit; wait for the Retry-After header.",
  },
  INTERNAL: {
    status: 500,
    retryable: true,
    level: "error",
    docs: "Unexpected failure; the message never includes internals.",
  },
  UNAVAILABLE: {
    status: 503,
    retryable: true,
    level: "error",
    docs: "The database is unreachable, or a feature the route needs is not configured: a job's store, alerts, CRUX_API_KEY, SMTP or Resend; ingest clients retry.",
  },
} as const satisfies { [Code in ErrorCode]: ErrorSpec };

export const ErrorCode = oneOf(errorCodes, {
  description: errorCodes
    .map((code) => `- \`${code}\` (${errorCatalog[code].status}): ${errorCatalog[code].docs}`)
    .join("\n"),
});

export const ErrorDetails = Type.Record(Type.String(), Type.Unknown(), {
  description:
    "Extra context for some codes: `fields` with each failed `path` and `message` for `VALIDATION_FAILED`, `retryAfterSeconds` for `RATE_LIMITED`.",
});
export type ErrorDetails = Static<typeof ErrorDetails>;

export const ApiError = Type.Object(
  {
    error: Type.Object({
      code: ErrorCode,
      message: Type.String({
        minLength: 1,
        description: "What went wrong, for people. Never includes internals.",
      }),
      details: Type.Optional(ErrorDetails),
      requestId: Type.String({
        minLength: 1,
        description:
          "The `X-Request-Id` the request sent, or a new `req_<uuid>`; also returned as the `X-Request-Id` header.",
      }),
      docs: Type.String({
        format: "uri",
        description: "Link to this error code in the API reference.",
      }),
    }),
  },
  {
    description: "The error envelope every failed request answers with.",
    examples: [notFound],
  },
);
export type ApiError = Static<typeof ApiError>;
