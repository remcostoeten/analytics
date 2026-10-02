import type { HttpError } from "@spoar/shared/http";
import { err } from "@spoar/shared/result";

import { engineError } from "../../errors";

/**
 * @name sendFailed
 * @description A failed HTTP send as an `UNAVAILABLE` result, with the provider's answer when it
 * gave one, so a delivery's `lastError` says what went wrong.
 *
 * @example
 * if (!sent.ok) return sendFailed(sent.error);
 */
export function sendFailed(error: HttpError) {
  const answer = error.body ? `: ${error.body}` : "";
  return err(engineError("UNAVAILABLE", `${error.message}${answer}`));
}
