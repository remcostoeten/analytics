import { expect } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

export type Row = {
  name: string | null;
  type: string;
  path: string | null;
  route: string | null;
  bot_score: number;
  bot_reasons: string[];
  device_type: string | null;
  meta: { [key: string]: unknown } | null;
};

/**
 * @name newRun
 * @description A unique path segment for one test, so its stored events can be told apart from
 * those of tests running in parallel against the same database.
 *
 * @example
 * const run = newRun();
 * await page.goto(`/direct/${run}`);
 */
export function newRun(): string {
  return crypto.randomUUID();
}

/**
 * @name storedRows
 * @description Waits until the events stored for a run satisfy `ready`, then returns them.
 *
 * @example
 * const rows = await storedRows(request, run, (rows) => rows.length >= 2);
 */
export async function storedRows(
  request: APIRequestContext,
  run: string,
  ready: (rows: Row[]) => boolean,
): Promise<Row[]> {
  let rows: Row[] = [];
  await expect
    .poll(
      async () => {
        const response = await request.get(`/__e2e/events?run=${run}`);
        rows = (await response.json()) as Row[];
        return ready(rows);
      },
      { timeout: 15_000 },
    )
    .toBe(true);
  return rows;
}

/**
 * @name names
 * @description The event names of stored rows, in order.
 *
 * @example
 * expect(names(rows)).toContain("pageview");
 */
export function names(rows: Row[]): (string | null)[] {
  return rows.map((row) => row.name);
}

/**
 * @name flush
 * @description Sends everything the page's client has queued now.
 *
 * @example
 * await flush(page);
 */
export async function flush(page: Page): Promise<void> {
  await page.evaluate("window.analytics.flush().then(() => null)");
}
