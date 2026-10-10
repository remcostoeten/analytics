import { engineError } from "@spoar/engine";
import type { Nullable } from "@spoar/shared/semantic";
import { Elysia } from "elysia";

import { failure } from "../../plugins/error-handler";

/**
 * @name setupModule
 * @description `GET /v2/setup`: the address of the retired setup page. It redirects to the
 * dashboard's admin module when `DASHBOARD_ORIGIN` is set, and answers 404 otherwise, since
 * projects and keys are now created in the dashboard or with `bun run setup`. Hidden from the
 * OpenAPI document.
 *
 * @example
 * app.use(setupModule("https://docs.analytics.remcostoeten.nl", docsBase));
 */
export function setupModule(dashboardOrigin: Nullable<string>, docsBase: string) {
  return new Elysia({ name: "setup" }).get(
    "/setup",
    ({ redirect, set }) => {
      if (dashboardOrigin) return redirect(`${dashboardOrigin}/dashboard/admin/projects`, 302);
      const failed = failure(
        engineError(
          "NOT_FOUND",
          "The setup page moved to the dashboard. Set DASHBOARD_ORIGIN to its origin, or create projects with bun run setup.",
        ),
        set.headers,
        docsBase,
      );
      set.status = failed.status;
      return failed.body;
    },
    { detail: { hide: true } },
  );
}
