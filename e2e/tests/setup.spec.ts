import { expect, test } from "@playwright/test";

import { adminCookie, apiPort } from "../ports";

const api = `http://localhost:${apiPort}`;
const domain = "shop.example";
const origins = "https://shop.example\nhttps://www.shop.example";

function envelope(id: string) {
  return JSON.stringify({
    v: 1,
    sentAt: "2026-10-07T12:00:00.000Z",
    events: [
      {
        id,
        name: "pageview",
        ts: "2026-10-07T11:59:58.000Z",
        visitor: "8c4e1f0a-2b3c-4d5e-8f60-718293a4b5c6",
        session: "f1a2b3c4-d5e6-4f70-8a91-b2c3d4e5f607",
        page: { path: "/setup-spec" },
        props: {},
        signals: 0,
      },
    ],
  });
}

test("signed out, the setup page offers GitHub sign-in and nothing else", async ({ page }) => {
  const response = await page.goto(`${api}/v2/setup`);
  expect(response?.status()).toBe(200);
  expect(response?.headers()["cache-control"]).toBe("private, no-store");
  expect(response?.headers()["content-security-policy"]).toContain("script-src 'nonce-");
  await expect(page.getByRole("button", { name: "Sign in with GitHub" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create project" })).toHaveCount(0);
  await expect(page.getByText("dashboard_users")).toBeVisible();
});

test("the owner creates a project, sends with its keys, rotates the secret", async ({
  page,
  context,
  request,
}) => {
  await context.addCookies([
    { name: adminCookie, value: "1", domain: "localhost", path: "/", sameSite: "Lax" },
  ]);
  await page.goto(`${api}/v2/setup`);
  await expect(page.getByText("owner · owner")).toBeVisible();
  const form = page.locator("form[data-create]");
  await form.getByLabel("Domain", { exact: true }).fill(domain);
  await expect(form.getByLabel("Id", { exact: true })).toHaveValue(domain);
  await expect(form.getByLabel("Allowed origins", { exact: true })).toHaveValue(origins);
  await form.getByLabel("Name", { exact: true }).fill("Shop");
  await form.getByRole("button", { name: "Create project" }).click();

  const keys = page.locator("#keys");
  await expect(keys).toBeVisible();
  await expect(keys.getByRole("heading", { name: `Keys for ${domain}` })).toBeVisible();
  const publicKey = await keys.locator("[data-key=public]").textContent();
  const secretKey = await keys.locator("[data-key=secret]").textContent();
  expect(publicKey).toMatch(/^pk_live_[0-9a-f]{16}$/);
  expect(secretKey).toMatch(/^sk_live_[0-9a-f]{32}$/);
  await expect(keys.locator("#env-block")).toContainText(
    `NEXT_PUBLIC_RA_CONFIG='{"project":"${domain}","key":"${publicKey}","endpoint":"/_ra"}'`,
  );
  await expect(keys.locator("#env-block")).toContainText(`RA_SECRET=${secretKey}`);
  await expect(keys.locator("#env-block")).toContainText(`RA_ENDPOINT=${api}`);
  expect(page.url()).not.toContain("sk_live_");

  const accepted = await request.post(`${api}/v2/events`, {
    headers: { authorization: `Bearer ${secretKey}`, "content-type": "application/json" },
    data: envelope("01928c3e-7a4b-7c1d-9f00-00000000a001"),
  });
  expect(accepted.status()).toBe(202);
  expect(await accepted.json()).toMatchObject({ accepted: 1 });

  await page.reload();
  const row = page.locator(`[data-project="${domain}"]`);
  await expect(row).toBeVisible();
  await expect(row.getByText(publicKey ?? "")).toBeVisible();
  await expect(row.getByLabel(`Allowed origins of ${domain}`)).toHaveValue(origins);

  await row.getByLabel(`Allowed origins of ${domain}`).fill("https://shop.example");
  await row.getByRole("button", { name: "Save origins" }).click();
  await expect(row.getByText("Saved", { exact: true })).toBeVisible();

  await row.getByRole("button", { name: "Rotate secret" }).click();
  await expect(row.getByText("The old secret stops working at once")).toBeVisible();
  await row.getByRole("button", { name: "Rotate now" }).click();
  await expect(keys.getByRole("heading", { name: `New secret key for ${domain}` })).toBeVisible();
  const rotated = await keys.locator("[data-key=secret]").textContent();
  expect(rotated).toMatch(/^sk_live_[0-9a-f]{32}$/);
  expect(rotated).not.toBe(secretKey);

  const refused = await request.post(`${api}/v2/events`, {
    headers: { authorization: `Bearer ${secretKey}`, "content-type": "application/json" },
    data: envelope("01928c3e-7a4b-7c1d-9f00-00000000a002"),
  });
  expect(refused.status()).toBe(401);
  const stillAccepted = await request.post(`${api}/v2/events`, {
    headers: { authorization: `Bearer ${rotated}`, "content-type": "application/json" },
    data: envelope("01928c3e-7a4b-7c1d-9f00-00000000a003"),
  });
  expect(stillAccepted.status()).toBe(202);
});
