import { expect, test } from "@playwright/test";

import { blockMs, lcpAt } from "../ports";
import { newRun, storedRows } from "./rows";

type Truth = { lcp: number; cls: number; inp: number; ready: boolean };

function within(stored: unknown, truth: number) {
  expect(typeof stored).toBe("number");
  expect(Math.abs(Number(stored) - truth)).toBeLessThanOrEqual(truth * 0.1);
}

test("stored LCP, INP and CLS land within 10% of what the browser measured", async ({
  page,
  request,
}) => {
  const run = newRun();
  await page.goto(`/vitals/${run}`);
  await page.waitForFunction("window.truth.ready");
  await page.click("#slow");
  await page.waitForTimeout(200);
  const truth = (await page.evaluate("window.truth")) as Truth;
  expect(truth.lcp).toBeGreaterThanOrEqual(lcpAt);
  expect(truth.inp).toBeGreaterThanOrEqual(blockMs);
  expect(truth.cls).toBeGreaterThan(0.05);
  await page.goto("about:blank");
  const rows = await storedRows(request, run, (found) =>
    ["lcp", "inp", "cls"].every((metric) => found.some((row) => row.meta?.metric === metric)),
  );
  function stored(metric: string) {
    return rows.filter((row) => row.meta?.metric === metric).at(-1)?.meta?.value;
  }
  within(stored("lcp"), truth.lcp);
  within(stored("inp"), truth.inp);
  within(stored("cls"), truth.cls);
});
