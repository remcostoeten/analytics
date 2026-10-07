import type { ErrorCode } from "@spoar/contract";
import { request } from "@spoar/shared/http";
import type { Fetcher, HttpError, HttpErrorKind, Json, JsonBody, Query } from "@spoar/shared/http";
import { err, ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";
import type { Milliseconds, Nullable } from "@spoar/shared/semantic";

import type {
  Call,
  ClientError,
  ClientErrorCode,
  ClientOptions,
  ClientResult,
  Send,
} from "./types";

type JsonRecord = { [key: string]: Json };

const defaultTimeoutMs = 10_000;

const statusOf = {
  VALIDATION_FAILED: 400,
  UNAUTHORIZED: 401,
  AUTH_REQUIRED: 401,
  FORBIDDEN_ORIGIN: 403,
  ORIGIN_NOT_ALLOWED: 403,
  FORBIDDEN: 403,
  WIDGET_REPORTS_DISABLED: 403,
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
} satisfies { [Kind in HttpErrorKind]: ClientErrorCode };

function isErrorCode(value: string): value is ErrorCode {
  return Object.hasOwn(statusOf, value);
}

function isRecord(value: Json | undefined): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJson(text: Nullable<string>): Json | undefined {
  if (text === null || text.trim().length === 0) return undefined;
  try {
    const value: Json = JSON.parse(text);
    return value;
  } catch {
    return undefined;
  }
}

function codeForStatus(status: Nullable<number>): ClientErrorCode {
  const match = Object.entries(statusOf).find(([, known]) => known === status);
  return match && isErrorCode(match[0]) ? match[0] : "BAD_RESPONSE";
}

function fromEnvelope(status: number, text: Nullable<string>, fallback: string): ClientError {
  const envelope = readJson(text);
  const body = isRecord(envelope) ? envelope.error : undefined;
  if (isRecord(body) && typeof body.code === "string" && isErrorCode(body.code)) {
    const { code, message, details, requestId } = body;
    return {
      code,
      message: typeof message === "string" ? message : fallback,
      status,
      details: isRecord(details) ? details : null,
      requestId: typeof requestId === "string" ? requestId : null,
    };
  }
  return {
    code: codeForStatus(status),
    message: fallback,
    status,
    details: null,
    requestId: null,
  };
}

function fromHttpError(error: HttpError): ClientError {
  if (error.kind === "status" && error.status !== null) {
    return fromEnvelope(error.status, error.body, error.message);
  }
  const code = error.kind === "status" ? codeForStatus(error.status) : kindCodes[error.kind];
  return { code, message: error.message, status: error.status, details: null, requestId: null };
}

function trusted<Body>(body: Json): Result<Body, string> {
  // The API checks every answer against the contract before sending it (decision 10).
  return ok(body as Body);
}

function withQuery(url: string, query: Query | undefined) {
  const target = new URL(url);
  for (const [name, value] of Object.entries(query ?? {})) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== null && item !== undefined) target.searchParams.append(name, String(item));
    }
  }
  return target.toString();
}

function combinedSignal(caller: AbortSignal | undefined, timeoutMs: Milliseconds) {
  const timeout = AbortSignal.timeout(timeoutMs);
  return caller ? AbortSignal.any([caller, timeout]) : timeout;
}

function thrownKind(caller: AbortSignal | undefined, error: Error | string): ClientErrorCode {
  if (caller?.aborted) return "ABORTED";
  if (error instanceof Error && error.name === "TimeoutError") return "TIMEOUT";
  return "NETWORK";
}

function failure(code: ClientErrorCode, message: string): ClientError {
  return { code, message, status: null, details: null, requestId: null };
}

/**
 * @name createSend
 * @description Builds the one HTTP layer every client method uses: `json` for routes that answer
 * JSON and `text` for CSV and SQL downloads. Both add the bearer token or browser credentials from
 * the options, append the query string (repeating array values), stop after `timeoutMs`, and turn
 * any failure into a `ClientError` whose `code` is the API's own code when the body carries one.
 * A `token` that is the empty string (an unset environment variable) answers `NO_TOKEN` without
 * a request, while no `token` at all sends anonymously. Neither ever throws.
 *
 * @example
 * const send = createSend({ endpoint: "https://api.analytics.remcostoeten.nl", token });
 * const stats = await send.json<StatsResponse>({ method: "GET", path: "/v2/projects/skriuw/stats" });
 */
export function createSend(options: ClientOptions): Send {
  let base = options.endpoint;
  while (base.endsWith("/")) base = base.slice(0, -1);
  const authorization: { [name: string]: string } = options.token
    ? { authorization: `Bearer ${options.token}` }
    : {};
  const fetcher: Fetcher = (url, init) => {
    const call = options.credentials ? { ...init, credentials: options.credentials } : init;
    return options.fetch ? options.fetch(url, call) : fetch(url, call);
  };

  const noToken = options.token === "" ? failure("NO_TOKEN", "token is empty") : null;

  async function json<Body>(call: Call): ClientResult<Body> {
    if (noToken) return err(noToken);
    const answer = await request<Body>({
      method: call.method,
      url: `${base}${call.path}`,
      query: call.query,
      body: call.body,
      headers: authorization,
      timeoutMs: call.timeoutMs ?? options.timeoutMs,
      signal: call.signal,
      fetch: fetcher,
      parse: trusted,
    });
    return answer.ok ? ok(answer.value.body) : err(fromHttpError(answer.error));
  }

  async function text(call: Call): ClientResult<string> {
    if (noToken) return err(noToken);
    const url = withQuery(`${base}${call.path}`, call.query);
    const timeoutMs = call.timeoutMs ?? options.timeoutMs ?? defaultTimeoutMs;
    const body: JsonBody | undefined = call.body;
    try {
      const response = await fetcher(url, {
        method: call.method,
        headers: {
          ...authorization,
          accept: "text/csv, application/sql, text/plain, application/json",
          ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: combinedSignal(call.signal, timeoutMs),
      });
      const content = await response.text();
      if (!response.ok) {
        return err(
          fromEnvelope(
            response.status,
            content,
            `${call.method} ${call.path} answered ${response.status}`,
          ),
        );
      }
      return ok(content);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return err(
        failure(thrownKind(call.signal, message), `${call.method} ${call.path} failed: ${message}`),
      );
    }
  }

  return { json, text };
}
