import { Elysia } from "elysia";

// Caller ids of 8 to 64 letters, digits, dashes or underscores are echoed; anything else is replaced.
const acceptable = /^[\w-]{8,64}$/;

function newId() {
  return `req_${crypto.randomUUID().replaceAll("-", "")}`;
}

/**
 * @name readRequestId
 * @description The request id set on this response, or an empty string before the request-id
 * plugin ran.
 *
 * @example
 * readRequestId(set.headers);
 */
export function readRequestId(headers: { [name: string]: unknown }): string {
  const value = headers["x-request-id"];
  return typeof value === "string" ? value : "";
}

/**
 * @name requestId
 * @description Reads `x-request-id` from the request, or creates `req_<uuid>`, and returns it on
 * every response so one id links a user report to its log lines and error body.
 *
 * @example
 * new Elysia().use(requestId());
 */
export function requestId() {
  return new Elysia({ name: "request-id" }).onRequest(({ request, set }) => {
    const incoming = request.headers.get("x-request-id");
    set.headers["x-request-id"] = incoming && acceptable.test(incoming) ? incoming : newId();
  });
}
