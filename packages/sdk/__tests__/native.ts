import { afterAll, beforeAll } from "bun:test";

import { GlobalRegistrator } from "@happy-dom/global-registrator";

import { pageUrl } from "./setup";

/**
 * @name withNativeRuntime
 * @description Swaps happy-dom out for the tests in the calling file, so server code sees Bun's
 * own `Request` and `Headers`, which keep `Origin` and `Sec-Fetch-*` headers.
 *
 * @example
 * withNativeRuntime();
 */
export function withNativeRuntime() {
  beforeAll(async () => {
    await GlobalRegistrator.unregister();
  });
  afterAll(() => {
    GlobalRegistrator.register({ url: pageUrl });
  });
}

/**
 * @name bodyText
 * @description The body a fake `fetch` received, which the SDK always sends as a string.
 *
 * @example
 * JSON.parse(bodyText(init));
 */
export function bodyText(init: RequestInit): string {
  return typeof init.body === "string" ? init.body : "";
}
