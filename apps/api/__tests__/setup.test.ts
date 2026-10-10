import { describe, expect, test } from "bun:test";

import { Elysia } from "elysia";

import { setupModule } from "../src/modules/setup/route";

const docsBase = "https://api.example.test/v2/openapi";

function open(dashboardOrigin: string | null) {
  return new Elysia({ prefix: "/v2" })
    .use(setupModule(dashboardOrigin, docsBase))
    .handle(new Request("https://api.example.test/v2/setup", { headers: { accept: "text/html" } }));
}

describe("GET /v2/setup", () => {
  test("redirects to the dashboard's admin module when the dashboard origin is set", async () => {
    const response = await open("https://docs.example.test");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://docs.example.test/dashboard/admin/projects",
    );
  });

  test("answers 404 with the error envelope without a dashboard origin", async () => {
    const response = await open(null);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("NOT_FOUND");
    expect(body.error.message).toContain("bun run setup");
  });
});
