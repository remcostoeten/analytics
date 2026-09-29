import { request } from "./request";
import type {
  HttpMethod,
  HttpOptions,
  HttpResult,
  Json,
  JsonBody,
  ParsedOptions,
  Parser,
} from "./types";

type Plain = HttpOptions & { parse?: undefined };

type Either<Body> = HttpOptions & { parse?: Parser<Body> };

function send<Body>(
  method: HttpMethod,
  url: string,
  body: JsonBody | undefined,
  options: Either<Body>,
) {
  const { parse, ...rest } = options;
  return parse
    ? request({ ...rest, method, url, body, parse })
    : request({ ...rest, method, url, body, parse: undefined });
}

/**
 * @name getJson
 * @description `GET` a URL and read its JSON answer; with `parse`, the answer is checked and
 * typed by it. See `request` for timeouts, errors and headers.
 *
 * @example
 * const project = await getJson(`${api}/v2/projects/remcostoeten.nl`, { headers: { authorization }, parse: projectBody });
 * if (project.ok) project.value.body.visibility; // "public"
 */
export async function getJson(url: string, options?: Plain): Promise<HttpResult<Json>>;
export async function getJson<Body>(
  url: string,
  options: ParsedOptions<Body>,
): Promise<HttpResult<Body>>;
export async function getJson<Body>(url: string, options: Either<Body> = {}) {
  return send("GET", url, undefined, options);
}

/**
 * @name postJson
 * @description `POST` a JSON body and read the JSON answer; with `parse`, the answer is checked
 * and typed by it. See `request` for timeouts, errors and headers.
 *
 * @example
 * const sent = await postJson("https://api.resend.com/emails", { from, to, subject, text }, { headers: { authorization: `Bearer ${key}` } });
 * if (!sent.ok) console.error(sent.error.kind, sent.error.message);
 */
export async function postJson(
  url: string,
  body: JsonBody,
  options?: Plain,
): Promise<HttpResult<Json>>;
export async function postJson<Body>(
  url: string,
  body: JsonBody,
  options: ParsedOptions<Body>,
): Promise<HttpResult<Body>>;
export async function postJson<Body>(url: string, body: JsonBody, options: Either<Body> = {}) {
  return send("POST", url, body, options);
}

/**
 * @name putJson
 * @description `PUT` a JSON body and read the JSON answer; with `parse`, the answer is checked and
 * typed by it. See `request` for timeouts, errors and headers.
 *
 * @example
 * const synced = await putJson(`${api}/v2/projects/remcostoeten.nl/alerts/targets`, { targets }, { headers: { authorization } });
 */
export async function putJson(
  url: string,
  body: JsonBody,
  options?: Plain,
): Promise<HttpResult<Json>>;
export async function putJson<Body>(
  url: string,
  body: JsonBody,
  options: ParsedOptions<Body>,
): Promise<HttpResult<Body>>;
export async function putJson<Body>(url: string, body: JsonBody, options: Either<Body> = {}) {
  return send("PUT", url, body, options);
}

/**
 * @name patchJson
 * @description `PATCH` a JSON body and read the JSON answer; with `parse`, the answer is checked
 * and typed by it. See `request` for timeouts, errors and headers.
 *
 * @example
 * const changed = await patchJson(`${api}/v2/projects/remcostoeten.nl`, { visibility: "private" }, { headers: { authorization } });
 */
export async function patchJson(
  url: string,
  body: JsonBody,
  options?: Plain,
): Promise<HttpResult<Json>>;
export async function patchJson<Body>(
  url: string,
  body: JsonBody,
  options: ParsedOptions<Body>,
): Promise<HttpResult<Body>>;
export async function patchJson<Body>(url: string, body: JsonBody, options: Either<Body> = {}) {
  return send("PATCH", url, body, options);
}

/**
 * @name deleteJson
 * @description `DELETE` a URL and read the JSON answer, `null` when it is empty; with `parse`, the
 * answer is checked and typed by it. See `request` for timeouts, errors and headers.
 *
 * @example
 * const removed = await deleteJson(`${api}/v2/projects/remcostoeten.nl/alerts/targets/ops`, { headers: { authorization } });
 */
export async function deleteJson(url: string, options?: Plain): Promise<HttpResult<Json>>;
export async function deleteJson<Body>(
  url: string,
  options: ParsedOptions<Body>,
): Promise<HttpResult<Body>>;
export async function deleteJson<Body>(url: string, options: Either<Body> = {}) {
  return send("DELETE", url, undefined, options);
}
