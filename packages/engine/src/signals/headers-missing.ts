import { defineSignal } from "../define";

/**
 * @name headersMissing
 * @description No `accept-language` header, which every browser sends. Requests with the secret
 * key come from a server and are skipped.
 *
 * @example
 * createEngine(ports, { ...registry, signals: [headersMissing] }, settings);
 */
export const headersMissing = defineSignal({
  name: "headers_missing",
  weight: 15,
  replayable: false,
  detect: (draft) => !draft.trusted && !draft.request.headers.get("accept-language"),
});
