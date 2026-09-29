import { err, ok } from "../result";
import type { Nullable } from "../semantic";
import type {
  HttpError,
  HttpErrorKind,
  HttpMethod,
  HttpResult,
  Json,
  Parser,
  Query,
  RequestInput,
} from "./types";

type Attempt = { method: HttpMethod; url: string };

const defaultTimeoutMs = 10_000;
const excerptLength = 500;

function failure(
  attempt: Attempt,
  kind: HttpErrorKind,
  message: string,
  status: Nullable<number> = null,
  body: Nullable<string> = null,
): HttpResult<never> {
  return err<HttpError>({ kind, message, method: attempt.method, url: attempt.url, status, body });
}

function excerpt(text: string): Nullable<string> {
  if (text.length === 0) return null;
  return text.length > excerptLength ? `${text.slice(0, excerptLength)}...` : text;
}

function withQuery(url: string, query: Query | undefined) {
  const target = new URL(url);
  for (const [name, value] of Object.entries(query ?? {})) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== null && item !== undefined) target.searchParams.append(name, String(item));
    }
  }
  return target;
}

function readJson(text: string): { ok: true; value: Json } | { ok: false } {
  if (text.trim().length === 0) return { ok: true, value: null };
  try {
    const value: Json = JSON.parse(text);
    return { ok: true, value };
  } catch {
    return { ok: false };
  }
}

function abortKind(caller: AbortSignal | undefined, timeout: AbortSignal): HttpErrorKind {
  if (caller?.aborted) return "aborted";
  return timeout.aborted ? "timeout" : "network";
}

function thrownMessage(
  attempt: Attempt,
  kind: HttpErrorKind,
  timeoutMs: number,
  error: Error | string,
) {
  const call = `${attempt.method} ${attempt.url}`;
  if (kind === "timeout") return `${call} timed out after ${timeoutMs} ms`;
  if (kind === "aborted") return `${call} was aborted`;
  return `${call} failed: ${error instanceof Error ? error.message : error}`;
}

/**
 * @name request
 * @description Sends one HTTP request with an optional JSON body and reads a JSON answer, as a
 * `Result` that never throws. It sets `accept` (and `content-type` with a body), appends `query`,
 * gives up after `timeoutMs` (10 seconds by default) or when `signal` aborts, and turns a non-2xx
 * status, an unreachable host, a body that is not JSON, or a body `parse` rejects into an
 * `HttpError` with its `kind`. An empty body reads as `null`. Errors name the URL without its
 * query string, so keys in a query never reach logs. It never retries; callers own that.
 *
 * @example
 * const answer = await request({ method: "POST", url: "https://api.resend.com/emails", body: mail, headers: { authorization: `Bearer ${key}` } });
 * if (!answer.ok) return answer;
 * answer.value.status; // 200
 */
export async function request(
  input: RequestInput<Json> & { parse?: undefined },
): Promise<HttpResult<Json>>;
export async function request<Body>(
  input: RequestInput<Body> & { parse: Parser<Body> },
): Promise<HttpResult<Body>>;
export async function request<Body>(input: RequestInput<Body>): Promise<HttpResult<Body | Json>> {
  let target: URL;
  try {
    target = withQuery(input.url, input.query);
  } catch {
    return failure(
      { method: input.method, url: input.url },
      "url",
      `${input.url} is not a valid URL`,
    );
  }
  const attempt = { method: input.method, url: `${target.origin}${target.pathname}` };
  const timeoutMs = input.timeoutMs ?? defaultTimeoutMs;
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = input.signal ? AbortSignal.any([input.signal, timeout]) : timeout;
  const headers: { [name: string]: string } = { accept: "application/json" };
  if (input.body !== undefined) headers["content-type"] = "application/json";
  const send = input.fetch ?? ((url: string, init: RequestInit) => fetch(url, init));
  let response: Response;
  let text: string;
  try {
    response = await send(target.toString(), {
      method: input.method,
      headers: { ...headers, ...input.headers },
      body: input.body === undefined ? undefined : JSON.stringify(input.body),
      signal,
    });
    text = await response.text();
  } catch (error) {
    const kind = abortKind(input.signal, timeout);
    const reason = error instanceof Error ? error : String(error);
    return failure(attempt, kind, thrownMessage(attempt, kind, timeoutMs, reason));
  }
  if (!response.ok) {
    return failure(
      attempt,
      "status",
      `${attempt.method} ${attempt.url} answered ${response.status}`,
      response.status,
      excerpt(text),
    );
  }
  const json = readJson(text);
  if (!json.ok) {
    return failure(
      attempt,
      "parse",
      `${attempt.method} ${attempt.url} did not answer JSON`,
      response.status,
      excerpt(text),
    );
  }
  if (!input.parse)
    return ok({ status: response.status, headers: response.headers, body: json.value });
  const parsed = input.parse(json.value);
  if (!parsed.ok) {
    return failure(
      attempt,
      "schema",
      `${attempt.method} ${attempt.url} answered an unexpected shape: ${parsed.error}`,
      response.status,
      excerpt(text),
    );
  }
  return ok({ status: response.status, headers: response.headers, body: parsed.value });
}
