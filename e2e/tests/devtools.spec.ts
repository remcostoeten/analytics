import { expect, test } from "@playwright/test";

import { adminCookie, sitePort } from "../ports";

test("a signed-out visitor downloads nothing past the devtools loader", async ({ page }) => {
  const scripts: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/devtools-dist/")) scripts.push(new URL(request.url()).pathname);
  });
  const session = page.waitForResponse((response) => response.url().includes("/v2/widget/session"));
  await page.goto("/devtools");
  expect((await session).status()).toBe(401);
  await page.waitForTimeout(500);
  expect(scripts.filter((path) => path.includes("mount-panel"))).toEqual([]);
  await expect(page.locator("ra-devtools")).toHaveCount(0);
});

test("an admin opens the panel, switches buffers and expands a log row", async ({
  page,
  context,
}) => {
  await context.addCookies([
    { name: adminCookie, value: "1", domain: "localhost", path: "/", sameSite: "Lax" },
  ]);
  await page.goto("/devtools");
  const widget = page.locator("ra-devtools");
  await expect(widget).toHaveCount(1);
  const pill = widget.getByRole("button", { name: /Open analytics devtools/ });
  await expect(pill).toBeVisible();
  await page.keyboard.press("Control+Shift+Period");
  const panel = widget.getByRole("region", { name: "Analytics devtools" });
  await expect(panel).toBeVisible();
  await expect(widget.getByRole("tab", { name: /visitors/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(widget.getByText("v_8f2a1c3e9c1e")).toBeVisible();

  await widget.getByRole("tab", { name: /logs/ }).click();
  await expect(widget.getByRole("tab", { name: /logs/ })).toHaveAttribute("aria-selected", "true");
  await widget.getByRole("button", { name: /RA_INGEST_REJECTED props exceed/ }).click();
  await expect(widget.getByRole("tree")).toContainText('"VALIDATION_FAILED"');

  await panel.press("5");
  await expect(widget.getByRole("tab", { name: /errors/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(widget.getByText("ChunkLoadError: Loading chunk 412 failed")).toBeVisible();

  await panel.press("Escape");
  await expect(pill).toBeVisible();
  expect(new URL(page.url()).port).toBe(String(sitePort));
});
