import type { ErrorCode } from "@remcostoeten/analytics-contract";
import { request } from "@remcostoeten/analytics-shared/http";
import type { HttpError, HttpErrorKind, Json } from "@remcostoeten/analytics-shared/http";
import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";

import { readsAdmin } from "./reads";
import type { ReadsAdmin } from "./reads";
import { alertsAdmin } from "./targets";
import type { AlertsAdmin } from "./targets";
import type { AdminCall, AdminError, AdminErrorCode, AdminOptions, AdminResult } from "./types";

export type Admin<Projects extends string> = ReadsAdmin<Projects> & {
  alerts: AlertsAdmin<Projects>;
};

type JsonRecord = { [key: string]: Json };

const statusOf = {
  VALIDATION_FAILED: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN_ORIGIN: 403,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  UNAVAILABLE: 503,
} satisfies { [Code in ErrorCode]: number };

const kindCodes = {
  url: "BAD_URL",
  timeout: "TIMEOUT",
  aborted: "ABORTED",
  network: "NETWORK",
  status: "BAD_RESPONSE",
  parse: "BAD_RESPONSE",
  schema: "BAD_RESPONSE",
} satisfies { [Kind in HttpErrorKind]: AdminErrorCode };

function isErrorCode(value: string): value is ErrorCode {
  return Object.hasOwn(statusOf, value);
}

function isRecord(value: Json | undefined): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJson(text: Nullable<string>): Json | undefined {
  if (text === null) return undefined;
  try {
    const value: Json = JSON.parse(text);
    return value;
  } catch {
    return undefined;
  }
}

function codeForStatus(status: Nullable<number>): AdminErrorCode {
  const match = Object.entries(statusOf).find(([, known]) => known === status);
  return match && isErrorCode(match[0]) ? match[0] : "BAD_RESPONSE";
}

function adminError(error: HttpError): AdminError {
  const envelope = readJson(error.body);
  const body = isRecord(envelope) ? envelope.error : undefined;
  if (error.kind === "status" && isRecord(body) && typeof body.code === "string") {
    const { code, message, details, requestId } = body;
    if (isErrorCode(code)) {
      return {
        code,
        message: typeof message === "string" ? message : error.message,
        status: error.status,
        details: isRecord(details) ? details : null,
        requestId: typeof requestId === "string" ? requestId : null,
      };
    }
  }
  const code = error.kind === "status" ? codeForStatus(error.status) : kindCodes[error.kind];
  return { code, message: error.message, status: error.status, details: null, requestId: null };
}

function trusted<Body>(body: Json): Result<Body, string> {
  // The API checks every answer against the contract before sending it (decision 10).
  return ok(body as Body);
}

/**
 * @name createAdmin
 * @description The admin client for server code and scripts: `admin.alerts` manages a project's
 * alert targets and the read methods (`stats`, `timeseries`, `breakdown`, `lifecycle`, `issues`)
 * read its numbers, each over one API route with the admin token. Every method resolves to
 * `{ ok: true, value }` or `{ ok: false, error }`, where `error.code` is a code from the contract's
 * error catalog or `NO_TOKEN`, `NETWORK`, `TIMEOUT`, `ABORTED`, `BAD_URL` or `BAD_RESPONSE`, and
 * never throws. `Projects` limits the project ids the methods accept.
 *
 * @example
 * const admin = createAdmin<"remcostoeten.nl" | "skriuw">({ endpoint: "https://api.remcostoeten.nl", token: process.env.RA_ADMIN_TOKEN });
 * const synced = await admin.alerts.sync("remcostoeten.nl", [mail({ to: ["remco@gmail.com"] })]);
 * if (!synced.ok) console.error(synced.error.code, synced.error.message);
 */
export function createAdmin<Projects extends string = string>(
  options: AdminOptions,
): Admin<Projects> {
  let base = options.endpoint;
  while (base.endsWith("/")) base = base.slice(0, -1);

  async function send<Body>(call: AdminCall): AdminResult<Body> {
    if (!options.token) {
      return err({
        code: "NO_TOKEN",
        message: "token is empty",
        status: null,
        details: null,
        requestId: null,
      });
    }
    const answer = await request<Body>({
      method: call.method,
      url: `${base}${call.path}`,
      query: call.query,
      body: call.body,
      headers: { authorization: `Bearer ${options.token}` },
      timeoutMs: options.timeoutMs,
      fetch: options.fetch,
      parse: trusted,
    });
    return answer.ok ? ok(answer.value.body) : err(adminError(answer.error));
  }

  return { ...readsAdmin<Projects>(send), alerts: alertsAdmin<Projects>(send) };
}
