import { defineConfig, devices } from "@playwright/test";

import { apiPort, dashboardPort, sitePort } from "./ports";

const executablePath = process.env.E2E_CHROMIUM_PATH;
const launchOptions = executablePath ? { executablePath } : {};

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${sitePort}` },
  webServer: [
    {
      command: "bun serve.ts",
      url: `http://localhost:${sitePort}/direct`,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
    },
    {
      command: "bun run --cwd ../apps/dashboard dev",
      url: `http://localhost:${dashboardPort}/dashboard/sign-in`,
      env: { NEXT_PUBLIC_API_URL: `http://localhost:${apiPort}` },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
  projects: [
    {
      name: "headless",
      testIgnore: /headed\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], launchOptions },
    },
    {
      name: "headed",
      testMatch: /headed\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        headless: false,
        launchOptions: {
          ...launchOptions,
          args: ["--disable-blink-features=AutomationControlled"],
        },
      },
    },
  ],
});
