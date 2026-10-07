import type { JsonBody } from "@spoar/shared/http";

/**
 * @name toBody
 * @description Turns a contract input type into the JSON body a request sends. Fields set to
 * `undefined` are left out, so "absent" in a patch means "leave it", as the API reads it.
 *
 * @example
 * send.json({ method: "PATCH", path, body: toBody({ status: "resolved" }) });
 */
export function toBody<Input>(value: Input): JsonBody {
  // JSON round trip: it drops undefined fields and yields the plain Json shape the body type wants.
  const body: JsonBody = JSON.parse(JSON.stringify(value));
  return body;
}
