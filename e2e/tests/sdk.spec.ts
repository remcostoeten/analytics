import { expect, test } from "@playwright/test";

import { flush, names, newRun, storedRows } from "./rows";

for (const transport of ["direct", "proxy"] as const) {
  test.describe(`${transport} transport`, () => {
    test("stores the first pageview, SPA navigation and a custom event", async ({
      page,
      request,
    }) => {
      const run = newRun();
      await page.goto(`/${transport}/${run}`);
      await page.click("#navigate");
      await page.evaluate('window.analytics.track("signup", { plan: "pro" })');
      await flush(page);
      const rows = await storedRows(request, run, (found) => found.length >= 3);
      const pageviews = rows.filter((row) => row.type === "pageview");
      expect(pageviews.map((row) => row.path)).toEqual([
        `/${transport}/${run}`,
        `/${transport}/${run}/next`,
      ]);
      expect(names(rows)).toContain("signup");
    });

    test("sends queued events with the beacon when the page is hidden", async ({
      page,
      request,
    }) => {
      const run = newRun();
      await page.goto(`/${transport}/${run}`);
      await page.goto("about:blank");
      const rows = await storedRows(request, run, (found) =>
        found.some((row) => row.type === "pageview"),
      );
      expect(rows[0]?.path).toBe(`/${transport}/${run}`);
    });
  });
}

test("required consent holds events until it is granted", async ({ page, request }) => {
  const run = newRun();
  await page.goto(`/consent/${run}`);
  await flush(page);
  await page.waitForTimeout(500);
  expect(await (await request.get(`/__e2e/events?run=${run}`)).json()).toEqual([]);
  await page.click("#grant");
  await flush(page);
  const rows = await storedRows(request, run, (found) => found.length >= 1);
  expect(rows[0]?.type).toBe("pageview");
});

test("?ra=ignore opts the browser out, so nothing is stored", async ({ page, request }) => {
  const run = newRun();
  await page.goto(`/direct/${run}?ra=ignore`);
  await page.click("#navigate");
  await flush(page);
  await page.goto("about:blank");
  await page.waitForTimeout(1000);
  expect(await (await request.get(`/__e2e/events?run=${run}`)).json()).toEqual([]);
});

test("speed insights stores web vitals when the page is hidden", async ({ page, request }) => {
  const run = newRun();
  await page.goto(`/direct/${run}`);
  await page.click("#name");
  await page.keyboard.type("Ada");
  await page.goto("about:blank");
  const rows = await storedRows(request, run, (found) =>
    ["fcp", "ttfb", "lcp"].every((metric) => found.some((row) => row.meta?.metric === metric)),
  );
  const vitals = rows.filter((row) => row.name === "web_vital");
  expect(vitals.every((row) => typeof row.meta?.value === "number")).toBe(true);
});

test("the errors plugin stores uncaught errors", async ({ page, request }) => {
  const run = newRun();
  await page.goto(`/direct/${run}`);
  await page.click("#fail");
  await page.waitForTimeout(200);
  await flush(page);
  const rows = await storedRows(request, run, (found) => found.some((row) => row.name === "error"));
  expect(JSON.stringify(rows.find((row) => row.name === "error")?.meta)).toContain(
    "fixture failure",
  );
});

test("a headless browser scores as a bot", async ({ page, request }) => {
  const run = newRun();
  await page.goto(`/direct/${run}`);
  await flush(page);
  const rows = await storedRows(request, run, (found) => found.length >= 1);
  expect(rows[0]?.bot_score).toBeGreaterThanOrEqual(50);
  expect(rows[0]?.device_type).toBe("bot");
});
