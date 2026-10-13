import { instant } from "@next/playwright";
import { expect, test } from "@playwright/test";

import { adminCookie, dashboardPort } from "../ports";

const origin = `http://localhost:${dashboardPort}`;
const project = `${origin}/dashboard/projects/site`;

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: adminCookie, value: "1", url: origin }]);
});

test("the web analytics page shows its shell on a page load", async ({ page }) => {
  await instant(
    page,
    async () => {
      await page.goto(project);
      await expect(page.locator("[aria-busy=true]").first()).toBeVisible();
      await expect(page.getByRole("heading", { name: "Web analytics for site" })).toHaveCount(0);
    },
    { baseURL: origin },
  );
  await expect(page.getByRole("heading", { name: "Web analytics for site" })).toBeVisible();
});

test("the sidebar opens speed without waiting on the server", async ({ page }) => {
  await page.goto(project);
  await expect(page.getByRole("heading", { name: "Web analytics for site" })).toBeVisible();
  await instant(page, async () => {
    await page
      .getByRole("navigation", { name: "Dashboard" })
      .getByRole("link", { name: "Speed" })
      .click();
    await page.waitForURL((url) => url.pathname === "/dashboard/projects/site/speed");
    await expect(page.getByRole("heading", { name: "Speed for site" })).toHaveCount(0);
  });
  await expect(page.getByRole("heading", { name: "Speed for site" })).toBeVisible();
});

test("the sidebar opens issues without waiting on the server", async ({ page }) => {
  await page.goto(`${project}/speed`);
  await expect(page.getByRole("heading", { name: "Speed for site" })).toBeVisible();
  await instant(page, async () => {
    await page
      .getByRole("navigation", { name: "Dashboard" })
      .getByRole("link", { name: "Issues" })
      .click();
    await page.waitForURL((url) => url.pathname === "/dashboard/projects/site/issues");
    await expect(page.locator("[aria-busy=true]").first()).toBeVisible();
  });
  await expect(page.getByRole("heading", { name: "Issues for site" })).toBeVisible();
});
