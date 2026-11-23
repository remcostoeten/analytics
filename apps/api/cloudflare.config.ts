import { execFileSync } from "node:child_process";

import { bindings, defineConfig } from "cf/config";

const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

export default defineConfig({
  worker: {
    name: "spoar-api",
    compatibilityDate: "2026-09-01",
    compatibilityFlags: ["nodejs_compat"],
    entrypoint: "src/worker.ts",
    observability: { enabled: true },
    domains: ["api.analytics.remcostoeten.nl"],
    env: {
      NODE_ENV: bindings.text("production"),
      COMMIT_SHA: bindings.text(commit),
      API_URL: bindings.secret(),
      AUTH_COOKIE_DOMAIN: bindings.secret(),
      BETTER_AUTH_SECRET: bindings.secret(),
      CRON_SECRET: bindings.secret(),
      DASHBOARD_ORIGIN: bindings.secret(),
      DATABASE_URL: bindings.secret(),
      GITHUB_CLIENT_ID: bindings.secret(),
      GITHUB_CLIENT_SECRET: bindings.secret(),
      IP_HASH_SECRET: bindings.secret(),
    },
  },
});
