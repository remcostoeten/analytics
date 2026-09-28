import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { oneOf, Url } from "./schema";

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
  "FORBIDDEN_ORIGIN",
  "FORBIDDEN",
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
  FORBIDDEN_ORIGIN: {
    status: 403,
    retryable: false,
    level: "warn",
    docs: "The public key was used from an origin that is not in the project's allowed origins.",
  },
  FORBIDDEN: {
    status: 403,
    retryable: false,
    level: "info",
    docs: "The token scope does not allow the action.",
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
    docs: "The ingest body is over 60 KB or has more than 50 events.",
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
    docs: "The database is unreachable; ingest clients retry.",
  },
} as const satisfies { [Code in ErrorCode]: ErrorSpec };

export const ErrorCode = oneOf(errorCodes);

export const ErrorDetails = Type.Record(Type.String(), Type.Unknown());
export type ErrorDetails = Static<typeof ErrorDetails>;

export const ApiError = Type.Object({
  error: Type.Object({
    code: ErrorCode,
    message: Type.String({ minLength: 1 }),
    details: Type.Optional(ErrorDetails),
    requestId: Type.String({ minLength: 1 }),
    docs: Url,
  }),
});
export type ApiError = Static<typeof ApiError>;
