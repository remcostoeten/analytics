import { expect, test } from "@playwright/test";

import { flush, newRun, storedRows } from "./rows";

test("a headed browser with real input scores under 50", async ({ page, request }) => {
  const run = newRun();
  await page.goto(`/direct/${run}`);
  await page.mouse.move(40, 40);
  await page.mouse.move(200, 120, { steps: 10 });
  await page.click("#name");
  await page.keyboard.type("Ada Lovelace", { delay: 30 });
  await page.click("#navigate");
  await flush(page);
  const rows = await storedRows(request, run, (found) => found.length >= 2);
  for (const row of rows) {
    expect(row.bot_score, JSON.stringify(row.bot_reasons)).toBeLessThan(50);
  }
});
